const dotenv = require('dotenv');
const { connectDB, sequelize } = require('./src/config/db');
const path = require('path');
let logger;
try {
    logger = require('./src/utils/logger');
} catch (e) {
    console.warn("Logger not found, using console fallback");
    logger = console;
}

const http = require('http');
const socketIo = require('socket.io');

const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

dotenv.config();

// TASK 8 — ENSURE REDIS ENV CONFIG
if (!process.env.REDIS_URL) {
    throw new Error('FATAL: REDIS_URL is required for production scaling and reliability');
}

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

const client = require('prom-client');
const jwt = require('jsonwebtoken');
const app = require('./src/app');

// TASK 5 — ADD RATE LIMITING (ABUSE PROTECTION)
const rateLimit = require('express-rate-limit');
const disbursementLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: "Too many disbursement attempts, try again later",
    keyGenerator: (req) => {
        // TASK 9 — STRONG RATE LIMIT KEY
        const userId = req.user?.id || req.user?._id || 'anonymous';
        return `${userId}:${req.ip}`;
    }
});
app.use('/api/disburse', disbursementLimiter);
app.use('/api/finance/', disbursementLimiter);
app.use('/api/notifications', disbursementLimiter);

// TASK 6/7 — ADD CORRELATION ID LOGGING & HEADERS
app.use((req, res, next) => {
    req.correlationId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    res.setHeader('X-Correlation-Id', req.correlationId);
    next();
});

// Observability: Prometheus
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'finance_api_' });

const httpRequestDuration = new client.Histogram({
    name: 'finance_http_latency_seconds',
    help: 'Request latency in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10] // Tailored for P95/P99 tracking
});

// Feature Flag System
global.features = {
    async isEnabled(flag) {
        const val = await require('./src/services/redisService').cache.get(`feature:${flag}`);
        return val === true;
    }
};


const server = http.createServer(app);

// Distributed Real-time: Socket.io with Redis Adapter (polling fallback enabled)
const io = socketIo(server, { 
    cors: { origin: '*', methods: ["GET", "POST"] },
    transports: ["websocket", "polling"]
});

// TASK 3 — ENABLE REDIS SOCKET ADAPTER (CRITICAL)
Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('[HA] Socket.io Redis Adapter active across instances.');
}).catch(err => {
    logger.error('Redis connection failed:', err);
    process.exit(1);
});

global.io = io;

// Enforce JWT Expiration & Auth
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth required'));

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Token expired or invalid'));
        // Extra check for distributed scaling: ensure user object has minimal requirements
        if (!decoded.id && !decoded._id) return next(new Error('Invalid token payload'));
        socket.user = decoded;
        next();
    });
});

io.on('connection', (socket) => {
    const userId = socket.user.id || socket.user._id;
    socket.join(userId);
    // Also join role-based room for broadcast notifications
    if (socket.user.role) {
        socket.join(`role:${socket.user.role}`);
    }
    logger.info(`[Socket] User ${userId} (${socket.user.role}) connected.`);

    // Explicit join event — lets the frontend re-join after reconnect
    // TASK 4 — VERIFY SOCKET ROOM JOIN
    socket.on('join', (targetUserId) => {
        const safeId = String(targetUserId || userId);
        socket.join(safeId);
        console.log(`[Socket] User joined room: ${safeId}`);
    });

    socket.on('disconnect', () => {
        logger.info(`[Socket] User ${userId} disconnected.`);
    });
});

// Latency & Slow API Detection Middleware
app.use((req, res, next) => {
    const start = process.hrtime();
    const end = httpRequestDuration.startTimer();

    res.on('finish', () => {
        const diff = process.hrtime(start);
        const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6);
        
        end({ method: req.method, route: req.route?.path || req.url, status: res.statusCode });
        
        if (timeInMs > 1000) {
            logger.warn(`[Slow API] Detected latency: ${timeInMs.toFixed(2)}ms`, {
                method: req.method,
                url: req.url,
                requestId: req.id
            });
        }
    });
    next();
});

// Protected Metrics
app.get('/metrics', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.METRICS_TOKEN}`) {
        return res.status(401).end('Unauthorized');
    }
    try {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
    } catch (err) {
        res.status(500).end(err);
    }
});

const PORT = process.env.PORT || 5000;
const queueService = require('./src/services/queueService');
connectDB().then(async () => {
    // Initialize HA Schedulers
    await queueService.setupRepeatableJobs();
    
    server.listen(PORT, () => {
        logger.info(`Enterprise Server active on port ${PORT}`);
        logger.info(`[HA] Socket.io Redis Adapter & Repeatable Jobs active.`);
    });
});



const gracefulShutdown = async (signal) => {
    logger.info(`[${signal}] Graceful shutdown sequence starting...`);
    server.close(async () => {
        try {
            await Promise.all([
                pubClient.quit(),
                subClient.quit(),
                sequelize.close()
            ]);
            logger.info('All distributed connections closed.');
            process.exit(0);
        } catch (err) {
            logger.error('Shutdown error:', err);
            process.exit(1);
        }
    });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

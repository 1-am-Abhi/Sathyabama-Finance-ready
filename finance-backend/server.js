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

let createAdapter;
try {
    createAdapter = require('@socket.io/redis-adapter').createAdapter;
} catch (e) {
    console.warn("⚠️ Redis adapter not installed, running in single-instance mode");
}

const client = require('prom-client');
const jwt = require('jsonwebtoken');
const app = require('./src/app');
const { pubClient, subClient, isHealthy } = require('./src/services/redisService');


dotenv.config();

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


if (createAdapter && isHealthy()) {
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('[HA] Socket.io Redis Adapter initialized.');
} else {
    logger.info('[HA] Running Socket.io in single-instance mode.');
}

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
    logger.info(`[Socket] User ${userId} connected to distributed cluster node.`);
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

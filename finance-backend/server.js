const dotenv = require('dotenv');
dotenv.config();

const { connectDB, sequelize, isDbReady } = require('./src/config/db');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const client = require('prom-client');
const app = require('./src/app');
const { setIO } = require('./src/socketInstance');

let logger;
try {
    logger = require('./src/utils/logger');
} catch (e) {
    console.warn("Logger not found, using console fallback");
    logger = console;
}

// Redis + Socket Adapter
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

// 🚨 Ensure REDIS_URL exists
if (!process.env.REDIS_URL) {
    throw new Error('FATAL: REDIS_URL is required for production scaling and reliability');
}

// Create Redis clients (TLS only in production or if using rediss://)
const redisConfig = {
    url: process.env.REDIS_URL,
    socket: {
        tls: process.env.NODE_ENV === 'production' || process.env.REDIS_URL.startsWith('rediss://'),
        rejectUnauthorized: false
    }
};

const pubClient = createClient(redisConfig);
const subClient = pubClient.duplicate();

// Rate limiting
const rateLimit = require('express-rate-limit');
const disbursementLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: "Too many disbursement attempts, try again later",
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/disburse', disbursementLimiter);
app.use('/api/finance/', disbursementLimiter);
app.use('/api/notifications', disbursementLimiter);

// Correlation ID
app.use((req, res, next) => {
    req.correlationId = `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    res.setHeader('X-Correlation-Id', req.correlationId);
    
    // 🔴 ISOLATE AUTH ROUTES (TASK 1)
    if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/v1/auth')) {
        return next(); // Skip all institutional finance logic
    }
    
    next();
});

// Prometheus metrics
client.collectDefaultMetrics({ prefix: 'finance_api_' });

const httpRequestDuration = new client.Histogram({
    name: 'finance_http_latency_seconds',
    help: 'Request latency in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10]
});

// Feature flags via Redis
global.features = {
    async isEnabled(flag) {
        const val = await require('./src/services/redisService').cache.get(`feature:${flag}`);
        return val === true;
    }
};

const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: '*', methods: ["GET", "POST"] },
    transports: ["websocket", "polling"]
});

setIO(io);

// 🔥 INIT REDIS + SOCKET ADAPTER
(async () => {
    try {
        await pubClient.connect();
        await subClient.connect();

        io.adapter(createAdapter(pubClient, subClient));
        logger.info('[Redis] Connected & Socket adapter initialized');

        // Health check
        setInterval(async () => {
            try {
                await pubClient.ping();
            } catch (err) {
                console.error('[Redis] ping failed', err);
            }
        }, 30000);

    } catch (err) {
        logger.error('Redis connection failed:', err);
    }
})();

// Socket auth
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth required'));

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Token expired or invalid'));
        if (!decoded.id && !decoded.userId && !decoded._id) return next(new Error('Invalid token payload'));
        socket.user = decoded;
        next();
    });
});

// Socket connection
io.on('connection', (socket) => {
    const userId = socket.user.id || socket.user._id;

    socket.join(userId);

    if (socket.user.role) {
        socket.join(`role:${socket.user.role}`);
    }

    logger.info(`[Socket] User ${userId} (${socket.user.role}) connected.`);

    socket.on('join', (targetUserId) => {
        const safeId = String(targetUserId || userId);
        socket.join(safeId);
        console.log(`[Socket] User joined room: ${safeId}`);
    });

    socket.on('join-finance', () => {
        if (socket.user.role === 'FINANCE_OFFICER' || socket.user.role === 'ADMIN') {
            socket.join('finance');
            console.log(`[Socket] Authorized User ${userId} joined finance room`);
        } else {
            console.warn(`[Socket] Unauthorized room join attempt by user ${userId} (Role: ${socket.user.role})`);
        }
    });

    socket.on('disconnect', () => {
        logger.info(`[Socket] User ${userId} disconnected.`);
    });
});

// Latency tracking
app.use((req, res, next) => {
    const start = process.hrtime();
    const end = httpRequestDuration.startTimer();

    res.on('finish', () => {
        const diff = process.hrtime(start);
        const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6);

        end({ method: req.method, route: req.route?.path || req.url, status: res.statusCode });

        if (timeInMs > 1000) {
            logger.warn(`[Slow API] ${timeInMs.toFixed(2)}ms`, {
                method: req.method,
                url: req.url
            });
        }
    });

    next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    const authHeader = req.headers.authorization;

    if (process.env.NODE_ENV === 'production' &&
        authHeader !== `Bearer ${process.env.METRICS_TOKEN}`) {
        return res.status(401).end('Unauthorized');
    }

    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

// Start server
const PORT = process.env.PORT || 5000;
const queueService = require('./src/services/queueService');
require('./src/workers/disbursementWorker');
require('./src/jobs/reportScheduler');

let dbServicesStarted = false;

const startDbServices = async () => {
    if (dbServicesStarted) return;

    // 🔴 DB SAFETY
    // await sequelize.sync(); // ONLY THIS - REMOVED FOR PRODUCTION STABILITY

    try {
        dbServicesStarted = true;

        // Seed standard chart of accounts
        const seedAccounts = require('./src/utils/accountSeeder');
        await seedAccounts();

        // Start financial snapshot scheduler
        const { initSnapshotJobs } = require('./src/jobs/snapshotJob');
        initSnapshotJobs();

        await queueService.setupRepeatableJobs();

        // 🔴 STARTUP SCHEMA CHECK (FOR STABILITY)
        const [results] = await sequelize.query(`
            SELECT table_schema, table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND lower(table_name) = 'ledgers'
            ORDER BY ordinal_position
        `);
        logger.info(`[DEBUG] Ledger columns raw: ${JSON.stringify(results)}`);
        const columns = results.map(c => c.column_name);
        const ledgerTableName = results[0]?.table_name || 'Ledgers';
        logger.info(`[System] Ledger columns verified on ${ledgerTableName}: ${columns.join(', ')}`);
        
        if (!columns.includes('accountId') || !columns.includes('journalId') || !columns.includes('disbursementId')) {
            logger.error('🚨 CRITICAL SCHEMA DRIFT: Core columns missing from Ledgers table!');
        }
    } catch (err) {
        dbServicesStarted = false;
        logger.warn('[System] DB-dependent services could not initialize. They will retry after DB reconnect.', {
            message: err.message
        });
    }
};

server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info('[System] HTTP server initialized');
});

setTimeout(() => {
    connectDB(startDbServices);
}, 5000);

setInterval(async () => {
    if (!isDbReady()) return;

    try {
        await sequelize.query('SELECT 1');
    } catch (err) {
        logger.warn('DB ping failed', { message: err.message });
    }
}, 30000);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`[${signal}] Shutdown started`);

    server.close(async () => {
        try {
            await Promise.all([
                pubClient.quit(),
                subClient.quit(),
                sequelize.close()
            ]);

            logger.info('Shutdown complete');
            process.exit(0);
        } catch (err) {
            logger.error('Shutdown error:', err);
            process.exitCode = 1;
        }
    });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

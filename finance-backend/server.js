require('dotenv').config();

const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const client = require('prom-client');

const { connectDB, sequelize, isDbReady } = require('./src/config/db');
const app = require('./src/app');
const { setIO } = require('./src/socketInstance');

// ================= LOGGER =================
let logger;
try {
  logger = require('./src/utils/logger');
} catch {
  console.warn('Logger not found, using console fallback');
  logger = console;
}

console.log('Schema sync disabled. Run `npm run migrate` before starting production.');

// ================= BASIC HEALTH ROUTES =================
// Root for Render health checks
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'finance-backend',
    timestamp: new Date().toISOString()
  });
});

// Simple health endpoint (can be used as explicit healthCheckPath on Render)
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    db: 'unknown',
    timestamp: new Date().toISOString()
  };

  try {
    if (isDbReady()) {
      await sequelize.query('SELECT 1');
      health.db = 'up';
    } else {
      health.db = 'initializing';
    }
    res.status(200).json(health);
  } catch (err) {
    health.status = 'error';
    health.db = 'down';
    res.status(503).json(health);
  }
});

// ================= REDIS =================
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const redisEnabled = process.env.NODE_ENV === 'production';

if (redisEnabled && !process.env.REDIS_URL) {
  throw new Error('FATAL: REDIS_URL is required');
}

const redisConfig = redisEnabled
  ? {
      url: process.env.REDIS_URL,
      socket: {
        tls: process.env.REDIS_URL.startsWith('rediss://'),
        rejectUnauthorized: false
      }
    }
  : null;

const pubClient = redisEnabled ? createClient(redisConfig) : null;
const subClient = redisEnabled ? pubClient.duplicate() : null;

// ================= RATE LIMIT =================
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many attempts, try later'
});

app.use('/api/disburse', limiter);
app.use('/api/finance', limiter);
app.use('/api/notifications', limiter);

// ================= CORRELATION =================
app.use((req, res, next) => {
  req.correlationId = `REQ-${Date.now()}`;
  res.setHeader('X-Correlation-Id', req.correlationId);
  next();
});

// ================= METRICS =================
client.collectDefaultMetrics({ prefix: 'finance_api_' });

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).send('Unable to collect metrics');
  }
});

// ================= SERVER =================
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

setIO(io);

// ================= REDIS INIT =================
(async () => {
  if (!redisEnabled) {
    logger.info('[Redis] Disabled outside production');
    return;
  }

  try {
    await pubClient.connect();
    await subClient.connect();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('[Redis] Connected');
  } catch (err) {
    logger.error('Redis failed:', err);
  }
})();

// ================= SOCKET AUTH =================
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Auth required'));

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Invalid token'));
    socket.user = decoded;
    next();
  });
});

// ================= SOCKET =================
io.on('connection', (socket) => {
  const userId = socket.user.id || socket.user._id;
  socket.join(userId);
  logger.info(`[Socket] ${userId} connected`);
});

// ================= DB SERVICES =================
let dbServicesStarted = false;

const startDbServices = async () => {
  if (dbServicesStarted) return;

  try {
    dbServicesStarted = true;

    const seedAccounts = require('./src/utils/accountSeeder');
    const seedDefaultUsers = require('./src/utils/seedDefaultUsers');

    await seedAccounts();
    await seedDefaultUsers();

    // ✅ JOBS
    const { initSnapshotJobs } = require('./src/jobs/snapshotJob');
    initSnapshotJobs();

    const queueService = require('./src/services/queueService');
    await queueService.setupRepeatableJobs();

    logger.info('[System] DB services started');
  } catch (err) {
    dbServicesStarted = false;
    logger.warn('DB services failed:', err.message);
  }
};

// ================= START SERVER =================
const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || "127.0.0.1";

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});

// ================= DB CONNECT =================
setTimeout(() => {
  connectDB(startDbServices);
}, 5000);

// ================= DB PING =================
setInterval(async () => {
  if (!isDbReady()) return;

  try {
    await sequelize.query('SELECT 1');
  } catch (err) {
    logger.warn('DB ping failed');
  }
}, 30000);

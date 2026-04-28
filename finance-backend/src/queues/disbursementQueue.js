const { Queue } = require("bullmq");
const { redisConnection } = require("../config/redis");

const disbursementQueue = new Queue("disbursement", {
  connection: redisConnection,
});

module.exports = { disbursementQueue };

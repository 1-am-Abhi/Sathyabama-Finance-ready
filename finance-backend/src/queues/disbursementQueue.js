const { Queue } = require("bullmq");
const { redisConnection, redisDisabled } = require("../config/redis");

if (redisDisabled) {
  const { executeDisbursementPipeline } = require("../services/financePipelineService");
  const { FundRequest, User } = require("../models");
  const { findUserByRuntimeId } = require("../utils/userIdentity");

  const disbursementQueue = {
    async add(name, data) {
      const request = await FundRequest.findOne({ where: { _id: data.requestId } });
      const user = await findUserByRuntimeId(User, data.userId);
      if (!request) throw new Error(`FundRequest not found: ${data.requestId}`);
      if (!user) throw new Error(`User not found: ${data.userId}`);
      const result = await executeDisbursementPipeline(request, data.payload, user, {
        correlationId: data.correlationId || `LOCAL-${Date.now()}`
      });
      return { id: `local-${Date.now()}`, name, data, returnvalue: result };
    }
  };

  module.exports = { disbursementQueue };
  return;
}

const disbursementQueue = new Queue("disbursement", {
  connection: redisConnection,
});

module.exports = { disbursementQueue };

const logger = require('../utils/logger');
const cron = require('node-cron');
const { Disbursement, FundRequest, Project } = require('../models');
const { Op } = require('sequelize');
const { sendReport } = require('../utils/sendEmail');

cron.schedule('0 9 * * 1', async () => {
  logger.info('[CRON] Running weekly financial report...');

  try {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const data = await Disbursement.findAll({
      where: {
        createdAt: {
          [Op.gte]: lastWeek,
        },
      },
      include: [
        {
          model: FundRequest,
          include: [Project],
        },
      ],
    });

    let total = 0;

    data.forEach(d => {
      total += Number(d.amount);
    });

    logger.info(`[CRON REPORT] Weekly Disbursed: ₹${total}`);

    await sendReport(`Weekly Disbursed Amount: ₹${total}`);
  } catch (err) {
    logger.error('[CRON ERROR]', err);
  }
});

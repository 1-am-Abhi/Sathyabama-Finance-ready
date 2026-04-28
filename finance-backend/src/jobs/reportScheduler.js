const cron = require('node-cron');
const { Disbursement, FundRequest, Project } = require('../models');
const { Op } = require('sequelize');
const { sendReport } = require('../utils/sendEmail');

cron.schedule('0 9 * * 1', async () => {
  console.log('[CRON] Running weekly financial report...');

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

    console.log(`[CRON REPORT] Weekly Disbursed: ₹${total}`);

    await sendReport(`Weekly Disbursed Amount: ₹${total}`);
  } catch (err) {
    console.error('[CRON ERROR]', err);
  }
});

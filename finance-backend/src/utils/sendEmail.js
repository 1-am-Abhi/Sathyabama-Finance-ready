const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendReport = async (text) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'admin@example.com',
      subject: 'Weekly Financial Report',
      text,
    });
    console.log('[EMAIL] Weekly report sent successfully');
  } catch (err) {
    console.error('[EMAIL ERROR]', err);
  }
};

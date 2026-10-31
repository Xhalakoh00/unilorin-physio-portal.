const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 10000, // Forces a quick failure after 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  const mailOptions = {
    // Make sure this matches your verified Brevo email exactly
    from: `NAPS Electoral Committee <salakhaleel07@gmail.com>`, 
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
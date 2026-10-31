const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,            // Reverting to 465 (SSL) which is preferred for IPv4
    secure: true,         // True for 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false 
    },
    family: 4,            // THE LIFESAVER: Forces IPv4 to bypass Google's IPv6 cloud block
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  const mailOptions = {
    from: `NAPS Electoral Committee <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
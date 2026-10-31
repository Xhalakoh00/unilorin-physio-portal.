const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Create a transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL/TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    // This tells Render's server not to get stuck on strict certificate checks
    rejectUnauthorized: false 
  },
  connectionTimeout: 10000, // Fails quickly (10 seconds) instead of hanging for minutes
  greetingTimeout: 10000,
  socketTimeout: 10000
});

  // 2. Define the email options
  const mailOptions = {
    from: `NAPS Electoral Committee <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  // 3. Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Create a transporter optimized for Cloud providers like Render
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,           // Switch to 587 to bypass cloud port-blocking
    secure: false,       // MUST be false when using port 587
    requireTLS: true,    // Forces a secure connection without triggering strict blocks
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false 
    },
    connectionTimeout: 10000, 
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
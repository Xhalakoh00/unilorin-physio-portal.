const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Voter = require('./models/Voter');
const sendEmail = require('./utils/sendEmail');

const testVoterEmail = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB...');

    const testEmailAddress = process.env.EMAIL_USER; 
    const testMatric = '22/47PT019';
    const testFullName = 'Test Physiotherapy Student';
    const rawPin = 'X9B2K7';

    // Remove any existing record with this test email or matric number to prevent collisions
    await Voter.deleteMany({ $or: [{ matricNumber: testMatric }, { email: testEmailAddress }] });

    console.log(`Generating test credentials for ${testEmailAddress}...`);

    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(rawPin, salt);

    // Save test voter
    await Voter.create({
      matricNumber: testMatric,
      email: testEmailAddress,
      fullName: testFullName,
      level: 400,
      votingPin: hashedPin,
    });

    // Construct email template
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #00b4d8; text-align: center;">NAPS E-Voting Portal</h2>
        <p>Dear <strong>${testFullName}</strong>,</p>
        <p>You have been registered to vote in the upcoming NAPS Departmental Election. Below are your secure login credentials:</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 16px;">Matric Number: <strong>${testMatric}</strong></p>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Voting PIN: <strong style="color: #ef4444; font-size: 20px; letter-spacing: 2px;">${rawPin}</strong></p>
        </div>
        <p style="color: #555; font-size: 14px;"><em>Note: Do not share this PIN with anyone. It can only be used once.</em></p>
      </div>
    `;

    await sendEmail({
      email: testEmailAddress,
      subject: 'Your Secure NAPS Voting Credentials (TEST)',
      html: emailHtml,
    });

    console.log(`\n SUCCESS! Email dispatched to ${testEmailAddress}. Check your inbox or spam folder.`);
    console.log(`You can now log in on the frontend using:`);
    console.log(`  Matric: ${testMatric}`);
    console.log(`  PIN:    ${rawPin}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Test Failed:', error.message);
    process.exit(1);
  }
};

testVoterEmail();
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const Position = require('../models/Position');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const Voter = require('../models/Voter');
const upload = require('../utils/upload');
const ElectionSession = require('../models/ElectionSession');
const ArchivedResult = require('../models/ArchivedResult');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const sendEmail = require('../utils/sendEmail');

// Protect all admin routes
router.use(protect, adminOnly);

// Helper function to generate a random 6-character alphanumeric PIN
const generateRandomPin = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing characters
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
};

// @route   POST /api/admin/candidates
// @desc    Add a new candidate with an image upload
router.post('/candidates', 
  (req, res, next) => {
    console.log("🚀 1. Request reached backend...");
    next();
  }, 
  upload.single('image'), 
  async (req, res) => {
    console.log("✅ 2. Image successfully uploaded to Cloudinary!");
    
    const { fullName, positionId, level, manifesto } = req.body;

    if (!fullName || !positionId || !level) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
      const imageUrl = req.file ? req.file.path : '';
      console.log("🔗 3. Saving to Database with URL:", imageUrl);

      const newCandidate = await Candidate.create({
        fullName,
        position: positionId,
        level,
        manifesto,
        imageUrl,
      });

      res.status(201).json({
        success: true,
        message: 'Candidate and photo successfully uploaded.',
        candidate: newCandidate,
      });
    } catch (error) {
      console.error("❌ Database Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/admin/reset-votes
// @desc    Wipe all votes and reset vote counts to 0 (Production Readiness)
router.delete('/reset-votes', async (req, res) => {
  try {
    await Vote.deleteMany({});
    await Candidate.updateMany({}, { voteCount: 0 });
    await Voter.updateMany({}, { votedPositions: [] });

    res.status(200).json({
      success: true,
      message: 'All election vote logs and tally counts have been reset.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/generate-voter
// @desc    Register a single voter, generate PIN, and email them with automated database rollback on email failure
router.post('/generate-voter', async (req, res) => {
  const { matricNumber, email, fullName, level } = req.body;

  if (!matricNumber || !email || !fullName || !level) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  let savedVoter = null;

  try {
    const formattedMatric = matricNumber.trim().toUpperCase();
    const formattedEmail = email.trim().toLowerCase();
    
    const voterExists = await Voter.findOne({ $or: [{ matricNumber: formattedMatric }, { email: formattedEmail }] });
    if (voterExists) {
      return res.status(400).json({ success: false, message: 'Voter with this Matric Number or Email already exists.' });
    }

    const rawPin = generateRandomPin();
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(rawPin, salt);

    // 1. Create and save the voter to MongoDB first
    savedVoter = await Voter.create({
      matricNumber: formattedMatric,
      email: formattedEmail,
      fullName: fullName.trim(),
      level,
      votingPin: hashedPin,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #00b4d8; text-align: center;">NAPS E-Voting Portal</h2>
        <p>Dear <strong>${fullName.trim()}</strong>,</p>
        <p>You have been registered to vote in the upcoming NAPS Departmental Election. Below are your secure login credentials:</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 16px;">Matric Number: <strong>${formattedMatric}</strong></p>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Voting PIN: <strong style="color: #ef4444; font-size: 20px; letter-spacing: 2px;">${rawPin}</strong></p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}" style="background-color: #00b4d8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Go to Voting Portal</a>
        </div>
        <p style="color: #555; font-size: 14px; text-align: center;"><em>Note: Do not share this PIN with anyone. It can only be used once.</em></p>
      </div>
    `;

    try {
      // 2. Attempt to send the email via Nodemailer
      await sendEmail({
        email: savedVoter.email,
        subject: 'Your Secure NAPS Voting Credentials',
        html: emailHtml,
      });

      // 3. Success response only if email leaves successfully
      res.status(201).json({
        success: true,
        message: `Voter created and email successfully sent to ${formattedEmail}.`,
      });

    } catch (emailError) {
      console.error('❌ Email dispatch timed out or failed:', emailError);
      
      // THE LIFESAVER: Rollback database entry if email fails so student isn't locked out/stuck
      if (savedVoter && savedVoter._id) {
        await Voter.findByIdAndDelete(savedVoter._id);
      }

      return res.status(500).json({ 
        success: false, 
        message: 'Email connection timed out or failed. Voter record was rolled back. Please try again.' 
      });
    }

  } catch (error) {
    console.error("❌ Admin Generate Voter Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/bulk-generate-voters
// @desc    Process a CSV array of voters, generate PINs, and email them
router.post('/bulk-generate-voters', async (req, res) => {
  const { voters } = req.body; 

  if (!voters || !Array.isArray(voters) || voters.length === 0) {
    return res.status(400).json({ success: false, message: 'No voter data provided.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const validVoters = [];
    const errorList = [];
    let successCount = 0;

    for (const row of voters) {
      if (!row.matricNumber || !row.email || !row.fullName) continue;

      const formattedMatric = row.matricNumber.trim().toUpperCase();
      const formattedEmail = row.email.trim().toLowerCase();
      
      // Skip if voter already exists
      const exists = await Voter.findOne({ $or: [{ matricNumber: formattedMatric }, { email: formattedEmail }] });
      if (exists) {
        errorList.push(`${formattedMatric} already registered.`);
        continue;
      }

      // Generate the raw PIN and Hash it securely
      const rawPin = generateRandomPin();
      const hashedPin = await bcrypt.hash(rawPin, salt);

      // Add to array using the exact field names from your Database Model
      validVoters.push({
        fullName: row.fullName.trim(),
        matricNumber: formattedMatric,
        email: formattedEmail,
        level: row.level || '400',
        votingPin: hashedPin 
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #00b4d8; text-align: center;">NAPS E-Voting Portal</h2>
          <p>Dear <strong>${row.fullName.trim()}</strong>,</p>
          <p>You have been registered for the upcoming NAPS Departmental Election.</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;">Matric Number: <strong>${formattedMatric}</strong></p>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Voting PIN: <strong style="color: #ef4444; font-size: 20px; letter-spacing: 2px;">${rawPin}</strong></p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}" style="background-color: #00b4d8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Go to Voting Portal</a>
          </div>
          <p style="color: #555; font-size: 14px; text-align: center;"><em>Note: Do not share this PIN. It is strictly for your use.</em></p>
        </div>
      `;

      try {
        await sendEmail({
          email: formattedEmail,
          subject: 'Your Secure NAPS Voting Credentials',
          html: emailHtml,
        });
        successCount++;
      } catch (bulkEmailErr) {
        console.error(`Bulk email failed for ${formattedMatric}:`, bulkEmailErr);
        errorList.push(`Failed to email ${formattedMatric}`);
      }
    }

    // Insert all the successfully processed voters into the database at once
    if (validVoters.length > 0) {
      await Voter.insertMany(validVoters);
    }

    res.status(200).json({
      success: true,
      message: `Bulk operation complete. Successfully registered and emailed ${successCount} students.`,
      errors: errorList,
    });
  } catch (err) {
    console.error("Bulk Upload Error:", err);
    res.status(500).json({ success: false, message: 'Server error during bulk upload.' });
  }
});

// @route   DELETE /api/admin/positions/:id
// @desc    Delete a position and all its candidates completely
router.delete('/positions/:id', async (req, res) => {
  try {
    const positionId = req.params.id;
    await Position.findByIdAndDelete(positionId);
    
    const Candidate = require('../models/Candidate');
    await Candidate.deleteMany({ position: positionId });
    
    res.json({ success: true, message: 'Position and associated candidates deleted.' });
  } catch (err) {
    console.error("Delete Position Error:", err);
    res.status(500).json({ success: false, message: 'Failed to delete position.' });
  }
});

// ==========================================
// MULTI-SESSION & ARCHIVE MANAGEMENT ROUTES
// ==========================================

router.post('/session', async (req, res) => {
  const { academicYear, startTime, endTime } = req.body;
  try {
    let session = await ElectionSession.findOne({ status: { $in: ['Upcoming', 'Active'] } });
    if (session) {
      session.academicYear = academicYear;
      session.startTime = startTime;
      session.endTime = endTime;
      await session.save();
      return res.json({ success: true, message: 'Election session time updated successfully!', session });
    }
    session = await ElectionSession.create({ academicYear, startTime, endTime, status: 'Upcoming' });
    res.json({ success: true, message: 'New election session created!', session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/session', async (req, res) => {
  try {
    const session = await ElectionSession.findOne({ status: { $in: ['Upcoming', 'Active'] } });
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/archives', async (req, res) => {
  try {
    const archives = await ArchivedResult.find().sort({ archivedAt: -1 });
    res.json({ success: true, archives });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/archive', async (req, res) => {
  try {
    const session = await ElectionSession.findOne({ status: { $in: ['Upcoming', 'Active'] } });
    if (!session) return res.status(400).json({ success: false, message: 'No active session found to archive.' });

    const positions = await Position.find();
    const electionData = [];
    let totalVotes = 0;

    for (let pos of positions) {
      const candidates = await Candidate.find({ position: pos._id }).sort({ voteCount: -1 }); 
      const candidateData = candidates.map((c, index) => {
        totalVotes += c.voteCount;
        return {
          fullName: c.fullName,
          voteCount: c.voteCount,
          isWinner: index === 0 && c.voteCount > 0 
        };
      });

      electionData.push({
        positionTitle: pos.title,
        candidates: candidateData
      });
    }

    await ArchivedResult.create({
      academicYear: session.academicYear,
      totalVotesCast: totalVotes,
      electionData: electionData
    });

    session.status = 'Archived';
    await session.save();

    await Candidate.deleteMany({});
    await Voter.deleteMany({ matricNumber: { $ne: 'ADMIN/001' } });

    res.json({ 
      success: true, 
      message: `The ${session.academicYear} election has been permanently archived. The system is now wiped and ready for the next session's voters!` 
    });
  } catch (err) {
    console.error("Archive Error:", err);
    res.status(500).json({ success: false, message: 'Failed to archive election.' });
  }
});

module.exports = router;
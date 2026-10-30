const express = require('express');
const router = express.Router();
const Position = require('../models/Position');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const Voter = require('../models/Voter');
const upload = require('../utils/upload');
const ElectionSession = require('../models/ElectionSession');
const ArchivedResult = require('../models/ArchivedResult');
const { protect, adminOnly } = require('../middleware/authMiddleware');


// Protect all admin routes
router.use(protect, adminOnly);

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
// @route   POST /api/admin/candidates
// @desc    Add a new candidate to a position
router.post('/candidates', async (req, res) => {
  const { fullName, positionId, level, manifesto, imageUrl } = req.body;

  try {
    const candidate = await Candidate.create({
      fullName,
      position: positionId,
      level,
      manifesto,
      imageUrl,
    });
    res.status(201).json({ success: true, candidate });
  } catch (error) {
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

const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');

// Helper function to generate a random 6-character alphanumeric PIN
const generateRandomPin = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing characters like I, 1, O, 0
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
};

// @route   POST /api/admin/generate-voter
// @desc    Register a voter, generate PIN, and email them
router.post('/generate-voter', async (req, res) => {
  const { matricNumber, email, fullName, level } = req.body;

  if (!matricNumber || !email || !fullName || !level) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const formattedMatric = matricNumber.trim().toUpperCase();
    
    // 1. Check if voter already exists
    const voterExists = await Voter.findOne({ $or: [{ matricNumber: formattedMatric }, { email }] });
    if (voterExists) {
      return res.status(400).json({ success: false, message: 'Voter with this Matric Number or Email already exists.' });
    }

    // 2. Generate a secure 6-character PIN
    const rawPin = generateRandomPin();

    // 3. Hash the PIN before saving to database
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(rawPin, salt);

    // 4. Save Voter to Database
    const newVoter = await Voter.create({
      matricNumber: formattedMatric,
      email,
      fullName,
      level,
      votingPin: hashedPin,
    });

    // 5. Send Email with the PIN
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #00b4d8; text-align: center;">NAPS E-Voting Portal</h2>
        <p>Dear <strong>${fullName}</strong>,</p>
        <p>You have been registered to vote in the upcoming NAPS Departmental Election. Below are your secure login credentials:</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 16px;">Matric Number: <strong>${formattedMatric}</strong></p>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Voting PIN: <strong style="color: #ef4444; font-size: 20px; letter-spacing: 2px;">${rawPin}</strong></p>
        </div>
        <p style="color: #555; font-size: 14px;"><em>Note: Do not share this PIN with anyone. It can only be used once.</em></p>
      </div>
    `;

    await sendEmail({
      email: newVoter.email,
      subject: 'Your Secure NAPS Voting Credentials',
      html: emailHtml,
    });

    res.status(201).json({
      success: true,
      message: `Voter created and email successfully sent to ${email}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/bulk-generate-voters
// @desc    Process a CSV array of voters, generate PINs, and email them
router.post('/bulk-generate-voters', async (req, res) => {
  const { voters } = req.body; // Expects an array of voter objects

  if (!voters || !Array.isArray(voters) || voters.length === 0) {
    return res.status(400).json({ success: false, message: 'No voter data provided.' });
  }

  let successCount = 0;
  let errorList = [];

  // Process voters sequentially to avoid overwhelming the database and Gmail rate limits
  for (const student of voters) {
    try {
      const formattedMatric = student.matricNumber.trim().toUpperCase();
      
      // Skip if voter already exists
      const exists = await Voter.findOne({ $or: [{ matricNumber: formattedMatric }, { email: student.email }] });
      if (exists) {
        errorList.push(`${formattedMatric} already registered.`);
        continue;
      }

      const rawPin = generateRandomPin();
      const salt = await bcrypt.genSalt(10);
      const hashedPin = await bcrypt.hash(rawPin, salt);

      const newVoter = await Voter.create({
        matricNumber: formattedMatric,
        email: student.email,
        fullName: student.fullName,
        level: student.level,
        votingPin: hashedPin,
      });

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #00b4d8; text-align: center;">NAPS E-Voting Portal</h2>
          <p>Dear <strong>${student.fullName}</strong>,</p>
          <p>You have been registered for the upcoming NAPS Departmental Election.</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;">Matric Number: <strong>${formattedMatric}</strong></p>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Voting PIN: <strong style="color: #ef4444; font-size: 20px; letter-spacing: 2px;">${rawPin}</strong></p>
          </div>
          <p style="color: #555; font-size: 14px;"><em>Note: Do not share this PIN. It is strictly for your use.</em></p>
        </div>
      `;

      await sendEmail({
        email: newVoter.email,
        subject: 'Your Secure NAPS Voting Credentials',
        html: emailHtml,
      });

      successCount++;
    } catch (err) {
      errorList.push(`Failed for ${student.matricNumber}: ${err.message}`);
    }
  }

  res.status(200).json({
    success: true,
    message: `Bulk operation complete. Successfully registered and emailed ${successCount} students.`,
    errors: errorList,
  });
});
// @route   DELETE /api/admin/positions/:id
// @desc    Delete a position and all its candidates completely
router.delete('/positions/:id', async (req, res) => {
  try {
    const positionId = req.params.id;
    
    // 1. Delete the position itself
    await Position.findByIdAndDelete(positionId);
    
    // 2. Delete any candidates that were running for this position
    const Candidate = require('../models/Candidate'); // Ensure model is required
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

// @route   POST /api/admin/session
// @desc    Create or update the active election session times
router.post('/session', async (req, res) => {
  const { academicYear, startTime, endTime } = req.body;
  try {
    // Check if there is already an active session we need to update
    let session = await ElectionSession.findOne({ status: { $in: ['Upcoming', 'Active'] } });
    
    if (session) {
      session.academicYear = academicYear;
      session.startTime = startTime;
      session.endTime = endTime;
      await session.save();
      return res.json({ success: true, message: 'Election session time updated successfully!', session });
    }

    // Otherwise, create a brand new one
    session = await ElectionSession.create({ academicYear, startTime, endTime, status: 'Upcoming' });
    res.json({ success: true, message: 'New election session created!', session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/admin/session
// @desc    Get the current active or upcoming session
router.get('/session', async (req, res) => {
  try {
    const session = await ElectionSession.findOne({ status: { $in: ['Upcoming', 'Active'] } });
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/admin/archives
// @desc    Get all past election results for the historical dropdown
router.get('/archives', async (req, res) => {
  try {
    const archives = await ArchivedResult.find().sort({ archivedAt: -1 });
    res.json({ success: true, archives });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/admin/archive
// @desc    Archive current results and cleanly wipe Candidates/Voters for the new year
router.post('/archive', async (req, res) => {
  try {
    const session = await ElectionSession.findOne({ status: { $in: ['Upcoming', 'Active'] } });
    if (!session) return res.status(400).json({ success: false, message: 'No active session found to archive.' });

    // 1. Gather all live results
    const positions = await Position.find();
    const electionData = [];
    let totalVotes = 0;

    for (let pos of positions) {
      // Sort candidates by votes to easily identify the winner
      const candidates = await Candidate.find({ position: pos._id }).sort({ voteCount: -1 }); 
      
      const candidateData = candidates.map((c, index) => {
        totalVotes += c.voteCount;
        return {
          fullName: c.fullName,
          voteCount: c.voteCount,
          isWinner: index === 0 && c.voteCount > 0 // The person with the most votes wins!
        };
      });

      electionData.push({
        positionTitle: pos.title,
        candidates: candidateData
      });
    }

    // 2. Save the final results to the permanent Historical Archive database
    await ArchivedResult.create({
      academicYear: session.academicYear,
      totalVotesCast: totalVotes,
      electionData: electionData
    });

    // 3. Mark the session as officially Closed/Archived
    session.status = 'Archived';
    await session.save();

    // 4. THE MASTER WIPE: 
    // Delete all candidates, and all voters (EXCEPT the Master Admin).
    // We keep the Positions intact so you don't have to retype "President", "VP", etc. next year!
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
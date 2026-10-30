const express = require('express');
const router = express.Router();
const Position = require('../models/Position');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const Voter = require('../models/Voter');
const ElectionSession = require('../models/ElectionSession');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/election/ballot
// @desc    Fetch positions and candidates
router.get('/ballot', async (req, res) => {
  try {
    const positions = await Position.find().sort({ displayOrder: 1 });
    const candidates = await Candidate.find().populate('position', 'title');

    const ballot = positions.map((pos) => ({
      positionId: pos._id,
      positionTitle: pos.title,
      candidates: candidates.filter(
        (c) => c.position && c.position._id.toString() === pos._id.toString()
      ),
    }));

    res.status(200).json({ success: true, ballot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/election/vote
// @desc    Cast a vote (Protected by JWT)
router.post('/vote', protect, async (req, res) => {
  const { positionId, candidateId } = req.body;
  const voterId = req.voter.id; // Extracted safely from token

  if (!positionId || !candidateId) {
    return res.status(400).json({
      success: false,
      message: 'Position ID and Candidate ID are required.',
    });
  }

  try {
    const voter = await Voter.findById(voterId);
    if (!voter) {
      return res.status(404).json({ success: false, message: 'Voter not found.' });
    }

    // Check double voting
    if (voter.votedPositions.includes(positionId)) {
      return res.status(400).json({
        success: false,
        message: 'You have already cast your vote for this position.',
      });
    }

    // Create vote audit log
    await Vote.create({
      voter: voterId,
      position: positionId,
      candidate: candidateId,
    });

    // Increment vote tally
    await Candidate.findByIdAndUpdate(candidateId, { $inc: { voteCount: 1 } });

    // Mark position as voted
    voter.votedPositions.push(positionId);
    await voter.save();

    res.status(200).json({
      success: true,
      message: 'Vote submitted and tallied successfully.',
      votedPositions: voter.votedPositions,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate vote attempt blocked by database constraint.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/election/results
// @desc    Get live election results and voter turnout
router.get('/results', async (req, res) => {
  try {
    const Position = require('../models/Position');
    const Candidate = require('../models/Candidate');
    const Voter = require('../models/Voter'); // Ensure Voter is imported

    // 1. Calculate Voter Turnout
    // Exclude the master admin from the count
    const totalVoters = await Voter.countDocuments({ matricNumber: { $ne: 'ADMIN/001' } });
    // Count how many voters have at least one item in their votedPositions array
    const votersWhoVoted = await Voter.countDocuments({ 
      matricNumber: { $ne: 'ADMIN/001' }, 
      'votedPositions.0': { $exists: true } 
    });

    // 2. Fetch Results
    const positions = await Position.find().sort({ displayOrder: 1 });
    const results = [];

    for (let pos of positions) {
      const candidates = await Candidate.find({ position: pos._id }).sort({ voteCount: -1 });
      
      const candidateData = candidates.map((c, index) => ({
        _id: c._id,
        fullName: c.fullName,
        voteCount: c.voteCount,
        imageUrl: c.imageUrl,
        isWinner: index === 0 && c.voteCount > 0
      }));

      results.push({
        _id: pos._id,
        title: pos.title,
        candidates: candidateData
      });
    }

    res.json({ 
      success: true, 
      results,
      turnout: { total: totalVoters, voted: votersWhoVoted } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching results.' });
  }
});

// @route   GET /api/election/session
// @desc    Get current election session details for the voter countdown timer
router.get('/session', async (req, res) => {
  try {
    const session = await ElectionSession.findOne({ status: { $in: ['Upcoming', 'Active'] } });
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching time.' });
  }
});
module.exports = router;
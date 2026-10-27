const express = require('express');
const router = express.Router();
const Position = require('../models/Position');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const Voter = require('../models/Voter');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Protect all admin routes
router.use(protect, adminOnly);

// @route   POST /api/admin/positions
// @desc    Add a new electoral position
router.post('/positions', async (req, res) => {
  const { title, displayOrder } = req.body;

  try {
    const position = await Position.create({ title, displayOrder });
    res.status(201).json({ success: true, position });
  } catch (error) {
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

module.exports = router;
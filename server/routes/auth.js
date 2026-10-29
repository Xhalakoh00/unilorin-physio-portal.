const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Voter = require('../models/Voter');
const { protect } = require('../middleware/authMiddleware');

const generateToken = (id, matricNumber, role) => {
  return jwt.sign({ id, matricNumber, role }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
};

// @route   POST /api/auth/login
// @desc    Authenticate voter with PIN & return token
router.post('/login', async (req, res) => {
  const { matricNumber, votingPin } = req.body;

  if (!matricNumber || !votingPin) {
    return res.status(400).json({ success: false, message: 'Matric number and Voting PIN are required.' });
  }

  try {
    const formattedMatric = matricNumber.trim().toUpperCase();
    const voter = await Voter.findOne({ matricNumber: formattedMatric });

    if (!voter) {
      return res.status(401).json({ success: false, message: 'Invalid Matric Number or PIN.' });
    }

    // Compare the plain text PIN entered by user with the hashed PIN in DB
    const isMatch = await bcrypt.compare(votingPin, voter.votingPin);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Matric Number or PIN.' });
    }

    const token = generateToken(voter._id, voter.matricNumber, voter.role);

    res.status(200).json({
      success: true,
      token,
      voter: {
        id: voter._id,
        matricNumber: voter.matricNumber,
        fullName: voter.fullName,
        level: voter.level,
        role: voter.role,
        votedPositions: voter.votedPositions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get currently logged-in voter data
router.get('/me', protect, async (req, res) => {
  try {
    const voter = await Voter.findById(req.voter.id).select('-votingPin');
    res.status(200).json({ success: true, voter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
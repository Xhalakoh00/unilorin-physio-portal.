const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Voter = require('../models/Voter');
const { protect } = require('../middleware/authMiddleware');

// Helper function to generate JWT
const generateToken = (id, matricNumber, role) => {
  return jwt.sign({ id, matricNumber, role }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a new student voter
router.post('/register', async (req, res) => {
  const { matricNumber, fullName, level, password } = req.body;

  if (!matricNumber || !fullName || !level || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const formattedMatric = matricNumber.trim().toUpperCase();

    // Check if voter already exists
    const existingVoter = await Voter.findOne({ matricNumber: formattedMatric });
    if (existingVoter) {
      return res.status(400).json({ success: false, message: 'Matric number already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create voter
    const voter = await Voter.create({
      matricNumber: formattedMatric,
      fullName,
      level,
      password: hashedPassword,
    });

    const token = generateToken(voter._id, voter.matricNumber, voter.role);

    res.status(201).json({
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

// @route   POST /api/auth/login
// @desc    Authenticate voter & return token
router.post('/login', async (req, res) => {
  const { matricNumber, password } = req.body;

  if (!matricNumber || !password) {
    return res.status(400).json({ success: false, message: 'Matric number and password are required.' });
  }

  try {
    const formattedMatric = matricNumber.trim().toUpperCase();
    const voter = await Voter.findOne({ matricNumber: formattedMatric });

    if (!voter) {
      return res.status(401).json({ success: false, message: 'Invalid Matric Number or Password.' });
    }

    const isMatch = await bcrypt.compare(password, voter.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Matric Number or Password.' });
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
    const voter = await Voter.findById(req.voter.id).select('-password');
    res.status(200).json({ success: true, voter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
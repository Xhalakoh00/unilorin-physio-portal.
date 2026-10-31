const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Voter = require('../models/Voter');
const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/auth/login
// @desc    Voter login
router.post('/login', async (req, res) => {
  const { matricNumber, pin, votingPin, password } = req.body;
  
  // Consolidate the PIN and FORCE UPPERCASE so it matches the DB perfectly
  let enteredPin = pin || votingPin || password;
  if (enteredPin) {
    enteredPin = enteredPin.toString().trim().toUpperCase();
  }
  
  try {
    if (!matricNumber) {
      return res.status(400).json({ message: 'Matric Number is required.' });
    }

    // Find the voter by Matric Number (trim spaces, case-insensitive)
    const voter = await Voter.findOne({ 
      matricNumber: new RegExp('^' + matricNumber.trim() + '$', 'i') 
    });
    
    if (!voter) {
      console.log("❌ Login Failed: Matric number not found.");
      return res.status(401).json({ message: 'Invalid Matric Number or PIN.' });
    }

    // Safely grab the hashed PIN from the database 
    const storedPin = voter.votingPin || voter.pin;

    // --- TERMINAL DEBUG LOGS ---
    console.log("👉 Login Attempt for:", voter.matricNumber);
    console.log("👉 Entered PIN (auto-uppercased):", enteredPin);
    console.log("👉 Stored HASH (from DB):", storedPin);
    // ---------------------------

    if (!enteredPin) {
       console.log("❌ Login Failed: Frontend did not send a PIN.");
       return res.status(400).json({ message: 'Please enter your PIN.' });
    }

    if (!storedPin) {
       console.log("❌ Login Failed: No PIN exists in the database for this user.");
       return res.status(401).json({ message: 'Invalid Matric Number or PIN.' });
    }

    // Compare using the newly captured and uppercased 'enteredPin'
    const isMatch = await bcrypt.compare(enteredPin, storedPin);
    console.log("👉 Did bcrypt match?:", isMatch);

    if (!isMatch) {
      console.log("❌ Login Failed: PIN mismatch.");
      return res.status(401).json({ message: 'Invalid Matric Number or PIN.' });
    }

    // Generate JWT Token on success
    const token = jwt.sign({ id: voter._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    console.log("✅ Login Successful!");
    res.json({ success: true, token, voter });
    
  } catch (err) {
    console.error("Login Route Error:", err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// @route   GET /api/auth/me
// @desc    Get logged in voter profile
router.get('/me', async (req, res) => {
  try {
    let token;
    
    // 1. Grab the token directly from the frontend request
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    // 2. Decode the token using your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Find the voter in the database (excluding the PIN for security)
    const voter = await Voter.findById(decoded.id).select('-votingPin -pin');
    
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }
    
    res.json({ success: true, voter });
  } catch (err) {
    console.error("Voter Profile Error:", err);
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
});

module.exports = router;
const jwt = require('jsonwebtoken');
const Voter = require('../models/Voter'); // We must import the Voter model!

// Verify standard student token
const protect = async (req, res, next) => { // Make sure this is async
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // 1. Decode the token to get the user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 2. Fetch the FULL user profile from the database (so we get the role and matric number)
      req.voter = await Voter.findById(decoded.id).select('-votingPin -pin');
      
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token.' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: No token provided.' });
  }
};

// Verify admin privileges
const adminOnly = (req, res, next) => {
  // 3. Bulletproof check: Look for the 'admin' role OR the master ADMIN/001 matric number
  if (req.voter && (req.voter.role === 'admin' || req.voter.matricNumber === 'ADMIN/001')) {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
  }
};

module.exports = { protect, adminOnly };
const jwt = require('jsonwebtoken');

// Verify standard student token
const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.voter = decoded;
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
  if (req.voter && req.voter.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
  }
};

module.exports = { protect, adminOnly };
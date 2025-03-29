const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user
      const user = await User.findOne({ where: { user_id: decoded.userId } });
      
      if (!user) {
        return res.status(401).json({
          message: 'User not found',
        });
      }

      // Add user to request object
      req.user = {
        id: user.user_id,
        fullName: `${user.firstname} ${user.lastname}`,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (error) {
      return res.status(401).json({
        message: 'Invalid token',
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      message: 'An error occurred while checking authentication',
    });
  }
};

// Middleware to check if user has required role
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied',
      });
    }

    next();
  };
};

module.exports = {
  auth,
  checkRole,
}; 
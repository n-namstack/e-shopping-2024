const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');

// Load environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

// Configure passport strategies
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ where: { email: profile.emails[0].value } });
    
    if (!user) {
      user = await User.create({
        firstname: profile.name.givenName,
        lastname: profile.name.familyName,
        email: profile.emails[0].value,
        username: profile.emails[0].value.split('@')[0],
        password_hash: await bcrypt.hash(Math.random().toString(36), 10),
        role: 'buyer', // Default role for social auth
        social_auth: {
          google: profile.id
        },
        is_verified: true
      });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.use(new FacebookStrategy({
  clientID: FACEBOOK_APP_ID,
  clientSecret: FACEBOOK_APP_SECRET,
  callbackURL: "/api/auth/facebook/callback",
  profileFields: ['id', 'emails', 'name']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ where: { email: profile.emails[0].value } });
    
    if (!user) {
      user = await User.create({
        firstname: profile.name.givenName,
        lastname: profile.name.familyName,
        email: profile.emails[0].value,
        username: profile.emails[0].value.split('@')[0],
        password_hash: await bcrypt.hash(Math.random().toString(36), 10),
        role: 'buyer', // Default role for social auth
        social_auth: {
          facebook: profile.id
        },
        is_verified: true
      });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Validation middleware
const registerValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('phone')
    .matches(/^\d{10}$/)
    .withMessage('Please enter a valid 10-digit phone number'),
  body('role')
    .isIn(['buyer', 'seller'])
    .withMessage('Invalid role specified'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = (app) => {
  // Register endpoint
  app.post('/api/auth/register', registerValidation, async (req, res) => {
    try {
      console.log('Registration request received:', req.body); // Debug log

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array()); // Debug log
        return res.status(400).json({ errors: errors.array() });
      }

      const { fullName, email, password, phone, role } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        console.log('User already exists:', email); // Debug log
        return res.status(400).json({
          message: 'User with this email already exists',
        });
      }

      // Split full name
      const [firstname, ...lastnameArray] = fullName.split(' ');
      const lastname = lastnameArray.join(' ');

      // Create user
      const password_hash = await bcrypt.hash(password, 10);
      const username = (firstname.charAt(0) + lastname).toLowerCase();

      console.log('Creating user with data:', { // Debug log
        firstname,
        lastname,
        username,
        email,
        role,
        phone
      });

      const user = await User.create({
        firstname,
        lastname,
        username,
        email,
        password_hash,
        role,
        cellphone_no: phone,
        is_verified: role === 'buyer', // Buyers are auto-verified
      });

      // Generate token
      const token = jwt.sign(
        { userId: user.user_id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('User created successfully:', user.user_id); // Debug log

      res.status(201).json({
        message: role === 'seller' 
          ? 'Registration successful. Please wait for verification.' 
          : 'Registration successful',
        user: {
          id: user.user_id,
          fullName: `${user.firstname} ${user.lastname}`,
          email: user.email,
          phone: user.cellphone_no,
          role: user.role,
          isVerified: user.is_verified,
        },
        token,
      });
    } catch (error) {
      console.error('Registration error:', error); // Debug log
      res.status(500).json({
        message: 'An error occurred during registration',
        error: error.message,
      });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', loginValidation, async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(401).json({
          message: 'Invalid email or password',
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({
          message: 'Invalid email or password',
        });
      }

      // Update last login
      user.last_login = new Date();
      await user.save();

      const token = jwt.sign(
        { userId: user.user_id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        user: {
          id: user.user_id,
          fullName: `${user.firstname} ${user.lastname}`,
          email: user.email,
          phone: user.cellphone_no,
          role: user.role,
          isVerified: user.is_verified,
        },
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        message: 'An error occurred during login',
        error: error.message,
      });
    }
  });

  // Google Auth routes
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { session: false }),
    (req, res) => {
      const token = jwt.sign(
        { userId: req.user.user_id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Redirect to app with token
      res.redirect(`/auth-callback?token=${token}`);
    }
  );

  // Facebook Auth routes
  app.get('/api/auth/facebook',
    passport.authenticate('facebook', { scope: ['email'] })
  );

  app.get('/api/auth/facebook/callback',
    passport.authenticate('facebook', { session: false }),
    (req, res) => {
      const token = jwt.sign(
        { userId: req.user.user_id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Redirect to app with token
      res.redirect(`/auth-callback?token=${token}`);
    }
  );

  // Get current user
  app.get('/api/auth/me', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          message: 'No token provided',
        });
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findOne({ where: { user_id: decoded.userId } });
      
      if (!user) {
        return res.status(404).json({
          message: 'User not found',
        });
      }

      res.json({
        user: {
          id: user.user_id,
          fullName: `${user.firstname} ${user.lastname}`,
          email: user.email,
          phone: user.cellphone_no,
          role: user.role,
          isVerified: user.is_verified,
        },
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          message: 'Invalid token',
        });
      }
      
      console.error('Auth check error:', error);
      res.status(500).json({
        message: 'An error occurred while checking authentication',
        error: error.message,
      });
    }
  });
};

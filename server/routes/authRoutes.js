const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let JWT_SECRET =
  process.env.JWT_SECRET || 'fallback_secret_for_development_only';

if (!process.env.JWT_SECRET) {
  console.warn(
    'No JWT_SECRET environment variable found. Generating a temporary secret (DEVELOPMENT ONLY)'
  );
  const tempSecret = require('crypto').randomBytes(32).toString('hex');
  console.log('Generated secret: ', tempSecret);
  JWT_SECRET = tempSecret;
}

module.exports = (app) => {
  app.post('/api/register', async (req, res) => {
    try {
      const {
        firstname,
        lastname,
        email,
        password,
        role,
        cellphone_no,
        profile_image,
        address_id,
      } = req.body;

      const password_hash = await bcrypt.hash(password, 10);
      const username = (firstname.charAt(0) + lastname).toLowerCase();

      const user = await User.create({
        firstname,
        lastname,
        username,
        email,
        password_hash,
        role,
        cellphone_no,
        profile_image,
        address_id,
      });

      res.status(201).json({ message: 'User registered successfully', user: user });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error registering user' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });

      // if user not found
      if (!user) {
        return res.status(401).json({ message: 'Invalid credencials' });
      }

      // if user found
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid credencials' });
      }

      const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, {
        expiresIn: '1h',
      });

      res.json({ token: token, user: user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error logging in' });
    }
  });
};

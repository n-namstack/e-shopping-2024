const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only'
function generateSecret(length){
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = ''

    for (let i = 0; i < length;i++){
        const randomIndex = Math.floor(Math.random() * characters.length)
        secret += characters.charAt(randomIndex)
    }

    return secret;
}

if (!process.env.JWT_SECRET) {
    console.warn("No JWT_SECRET environment variable found. Generating a temporary secret (DEVELOPMENT ONLY)")
    const tempSecret = generateSecret(32);
    JWT_SECRET = tempSecret;
    console.log('Generated secret: ',JWT_SECRET)
}

router.post('/register', async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      username,
      email,
      password,
      role,
      cellphone_no,
      profile_image,
      address_id,
    } = req.body;

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstname,
      lastname,
      username,
      email,
      password,
      role,
      cellphone_no,
      profile_image,
      address_id,
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const {email,password} = req.body;
    const user = User.findOne({ where: { email } });

    // if user not found
    if(!user){
        return res.status(401).json({message:'Invalid credencials'})
    }

    // if user found
    const passwordMatch = await bcrypt.compare(password,user.password_hash);
    if (!passwordMatch) {
        return res.status(401).json({message:'Invalid credencials'})
    }

    const token jwt.sign({userId:user.user_id},JWT_SECRET,{expiresIn:'1h'});
    res.json({token})

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

module.export = router;

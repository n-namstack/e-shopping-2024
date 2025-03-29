require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const { Client } = require('pg');
const Product = require('./models/Product');
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const shopRoutes = require('./routes/shopRoutes');
const setupAssociations = require('./models/associations');

// Set up model associations
setupAssociations();

//Initializing the app
const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:19006',
    'http://localhost:19000',
    'http://10.0.2.2:3000',
    'http://10.0.2.2:19006',
    'http://10.0.2.2:19000',
    'exp://localhost:19000',
    'exp://10.0.2.2:19000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());

// Initializing the routes
productRoutes(app);
authRoutes(app);
shopRoutes(app);

// Runing the sever on the defined port
app.listen(port, () => {
  console.info(`Running at http://localhost:${port}`);
});

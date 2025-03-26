const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const Product = require('./models/Product');
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const shopRoutes = require('./routes/shopRoutes');

//Initializing the app
const app = express();
const port = 8000;

//Initialising cors
app.use(cors());
app.use(express.json());

// Initializing the routes
productRoutes(app);
authRoutes(app);
shopRoutes(app);

// Runing the sever on the defined port
app.listen(port, () => {
  console.info(`Running at http://localhost:${port}`);
});

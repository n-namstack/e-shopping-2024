const express = require('express');
const router = express.Router();
const Shop = require('../models/shop');
const authMidleware = require('../authMiddleware/authMiddleware');

module.exports = (app) => {
  app.post('/api/create-shop', async (req, res) => {
    try {
      const {
        shop_name,
        shop_description,
        shop_address,
        shopProfileiImage,
        shopBackground_image,
        user_id
      } = req.body;

      const shop = await Shop.create({
        shop_name,
        shop_description,
        shop_address,
        shopProfileiImage,
        shopBackground_image,
        user_id,
      });
      res.status(201).json(shop);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error creating shop' });
    }
  });
};

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const authMiddleware = require('../authMiddleware/authMiddleware');

router.post('/add-product', authMiddleware, async (req, res) => {
  try {
    const {
      product_name,
      product_description,
      product_price,
      product_image,
      product_imgs,
      product_video,
      product_condition,
      product_isoff,
      product_offprecentage,
      product_category,
      product_quantity,
      product_ratings,
      product_review,
      product_color,
      product_size,
      description,
      price,
      image_url,
      inventory,
    } = req.body;
    const product = await Product.create({
      product_name,
      product_description,
      product_price,
      product_image,
      product_imgs,
      product_video,
      product_condition,
      product_isoff,
      product_offprecentage,
      product_category,
      product_quantity,
      product_ratings,
      product_review,
      product_color,
      product_size,
      description,
      price,
      image_url,
      inventory,
      shop_id: req.shop_id,
    });
    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating product' });
  }
});

module.exports = router;

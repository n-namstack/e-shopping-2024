const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

module.exports = (app) => {
  app.post('/api/add-product', async (req, res) => {
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
        shop_id,
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
        shop_id,
      });
      res.status(201).json(product);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error creating product' });
    }
  });

  // Fech products from database
  // console.log('Middleware object type: ', typeof authMiddleware);

  app.get('/api/get-products', async (req, res) => {
    try {
      const products = await Product.findAll();
      res.json(products);
    } catch (error) {
      console.error('Error fetching products: ', error);
      res.status(500).json({ message: 'Error fetching products' });
    }
  });

  // Get single product data endpoint
  app.get('/api/get-product/:id', async (req, res) => {
    try {
      const product = await Product.findByPk(req.params.id);
      if (product) {
        res.json(product);
      } else {
        return res.status(404).json({ message: 'Product not found' });
      }
    } catch (error) {
      console.error('Error fetching product: ', error);
      res.status(500).json({ message: 'Error fetching product' });
    }
  });
};

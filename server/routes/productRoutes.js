const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const { auth, checkRole } = require('../authMiddleware/auth');

module.exports = (app) => {
  // Create a new product
  app.post('/api/products', auth, checkRole(['seller']), async (req, res) => {
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
        shop_id
      } = req.body;

      // Validate required fields
      if (!product_name || !product_price || !product_category || !shop_id) {
        return res.status(400).json({
          success: false,
          message: 'Name, price, category and shop ID are required'
        });
      }

      // Check if shop exists and user owns it
      const shop = await Shop.findByPk(shop_id);
      if (!shop) {
        return res.status(404).json({
          success: false,
          message: 'Shop not found'
        });
      }

      if (shop.owner_id !== req.user.user_id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add products to this shop'
        });
      }

      const product = await Product.create({
        product_name,
        product_description,
        product_price,
        product_image,
        product_imgs,
        product_video,
        product_condition: product_condition || 'new',
        product_isoff: product_isoff || false,
        product_offprecentage: product_offprecentage || 0,
        product_category,
        product_quantity: product_quantity || 0,
        product_ratings: 0,
        shop_id
      });

      res.status(201).json({
        success: true,
        product
      });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating product',
        error: error.message
      });
    }
  });

  // Get all products
  app.get('/api/products', async (req, res) => {
    try {
      const products = await Product.findAll({
        include: [{
          model: Shop,
          as: 'shop',
          attributes: ['shop_id', 'name']
        }]
      });

      res.status(200).json({
        success: true,
        products
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching products',
        error: error.message
      });
    }
  });

  // Get products by shop ID
  app.get('/api/shops/:shopId/products', async (req, res) => {
    try {
      const products = await Product.findAll({
        where: { shop_id: req.params.shopId },
        include: [{
          model: Shop,
          as: 'shop',
          attributes: ['shop_id', 'name']
        }]
      });

      res.status(200).json({
        success: true,
        products
      });
    } catch (error) {
      console.error('Error fetching shop products:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching shop products',
        error: error.message
      });
    }
  });

  // Update product
  app.put('/api/products/:productId', auth, checkRole(['seller']), async (req, res) => {
    try {
      const product = await Product.findByPk(req.params.productId, {
        include: [{
          model: Shop,
          as: 'shop'
        }]
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Check if user owns the shop that has this product
      if (product.shop.owner_id !== req.user.user_id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this product'
        });
      }

      await product.update(req.body);

      res.status(200).json({
        success: true,
        product
      });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating product',
        error: error.message
      });
    }
  });

  // Delete product
  app.delete('/api/products/:productId', auth, checkRole(['seller']), async (req, res) => {
    try {
      const product = await Product.findByPk(req.params.productId, {
        include: [{
          model: Shop,
          as: 'shop'
        }]
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Check if user owns the shop that has this product
      if (product.shop.owner_id !== req.user.user_id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this product'
        });
      }

      await product.destroy();

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting product',
        error: error.message
      });
    }
  });
};

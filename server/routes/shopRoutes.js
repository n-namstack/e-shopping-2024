const express = require('express');
const { auth, checkRole } = require('../authMiddleware/auth');
const Shop = require('../models/Shop');
const User = require('../models/User');

module.exports = function(app) {
  // Create a new shop
  app.post('/api/create-shop', auth, checkRole(['seller']), async (req, res) => {
    try {
      const { 
        name, 
        description, 
        owner_id,
        logo, 
        banner, 
        address, 
        contact_info, 
        business_hours, 
        categories 
      } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Shop name is required'
        });
      }
      
      if (!contact_info) {
        return res.status(400).json({
          success: false,
          message: 'Contact information is required'
        });
      }

      // Use authenticated user's ID from token if owner_id not explicitly provided
      const shopOwnerId = owner_id || req.user.user_id;
      
      if (!shopOwnerId) {
        return res.status(400).json({
          success: false,
          message: 'Owner ID is required',
          error: 'Shop.owner_id cannot be null'
        });
      }

      // Create shop owned by current user
      const shop = await Shop.create({
        name,
        description,
        owner_id: shopOwnerId, // Ensure owner_id is set properly
        logo,
        banner,
        address,
        contact_info,
        business_hours,
        categories,
        status: 'pending' // New shops need approval
      });

      res.status(201).json({
        success: true,
        shop
      });
    } catch (error) {
      console.error('Error creating shop:', error);
      
      // Handle specific errors with better messages
      if (error.message && error.message.includes('verified sellers')) {
        return res.status(403).json({
          success: false,
          message: 'Only verified sellers can create shops',
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'An error occurred while creating shop',
        error: error.message
      });
    }
  });

  // Get all shops - no auth required for public listing
  app.get('/api/shops', async (req, res) => {
    try {
      const shops = await Shop.findAll({
        include: [{
          model: User,
          as: 'owner',
          attributes: ['user_id', 'username', 'email'] // Only include necessary fields
        }],
        where: {
          status: 'active' // Only show active shops
        }
      });

      return res.status(200).json({
        success: true,
        shops
      });
    } catch (error) {
      console.error('Error fetching shops:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Error fetching shops',
        error: error.message 
      });
    }
  });

  // Get shop by ID
  app.get('/api/shops/:shopId', async (req, res) => {
    try {
      const shop = await Shop.findByPk(req.params.shopId, {
        include: [{
          model: User,
          as: 'owner',
          attributes: ['user_id', 'username', 'email']
        }]
      });

      if (!shop) {
        return res.status(404).json({
          success: false,
          message: 'Shop not found'
        });
      }

      return res.status(200).json({
        success: true,
        shop
      });
    } catch (error) {
      console.error('Error fetching shop:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching shop',
        error: error.message
      });
    }
  });

  // Update shop
  app.put('/api/shops/:shopId', auth, async (req, res) => {
    try {
      const shop = await Shop.findByPk(req.params.shopId);
      
      if (!shop) {
        return res.status(404).json({
          success: false,
          message: 'Shop not found'
        });
      }

      // Check if user owns the shop
      if (shop.owner_id !== req.user.user_id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this shop'
        });
      }

      await shop.update(req.body);

      return res.status(200).json({
        success: true,
        shop
      });
    } catch (error) {
      console.error('Error updating shop:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating shop',
        error: error.message
      });
    }
  });

  // Delete shop
  app.delete('/api/shops/:shopId', auth, async (req, res) => {
    try {
      const shop = await Shop.findByPk(req.params.shopId);
      
      if (!shop) {
        return res.status(404).json({
          success: false,
          message: 'Shop not found'
        });
      }

      // Check if user owns the shop
      if (shop.owner_id !== req.user.user_id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this shop'
        });
      }

      await shop.destroy();

      return res.status(200).json({
        success: true,
        message: 'Shop deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting shop:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting shop',
        error: error.message
      });
    }
  });
};

const express = require('express');
const { auth, checkRole } = require('../authMiddleware/auth');
const Shop = require('../models/Shop');

module.exports = function(app) {
  // Create a new shop
  app.post('/api/create-shop', auth, checkRole(['seller']), async (req, res) => {
    try {
      const { 
        name, 
        description, 
        logo, 
        banner, 
        address, 
        contact_info, 
        business_hours, 
        categories 
      } = req.body;

      // Create shop owned by current user
      const shop = await Shop.create({
        name,
        description,
        owner_id: req.user.id,
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
      res.status(500).json({
        success: false,
        message: 'An error occurred while creating shop',
        error: error.message
      });
    }
  });
};

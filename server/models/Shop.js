const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('../models/User');

const Shop = sequelize.define('Shop', {
  shop_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  owner_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id',
    },
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  banner: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'suspended'),
    defaultValue: 'pending',
  },
  address: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  contact_info: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  business_hours: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  categories: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  total_reviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  verification_documents: {
    type: DataTypes.JSON,
    allowNull: true,
  }
}, {
  timestamps: true,
  tableName: 'shops',
  hooks: {
    beforeCreate: async (shop) => {
      // Check if owner is a verified seller
      const User = require('./User');
      const owner = await User.findByPk(shop.owner_id);
      if (!owner || owner.role !== 'seller' || !owner.is_verified) {
        throw new Error('Only verified sellers can create shops');
      }
    }
  }
});

Shop.beforeUpdate((shop) => {
  shop.updatedAt = new Date();
});

module.exports = Shop;

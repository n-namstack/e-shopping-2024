const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');
const User = require('../models/User');

const Shop = sequelize.define('Shop', {
  shop_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  shop_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  shop_description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  shop_address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  shopProfile_image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  shopBackground_image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

Shop.beforeUpdate(() => {
  shop.updatedAt = new Date();
});

Shop.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Shop;

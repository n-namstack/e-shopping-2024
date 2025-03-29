const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');
const Shop = require('../models/Shop');

const Product = sequelize.define('Product', {
  product_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  product_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  product_description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  product_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  product_image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  product_imgs: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
  },
  product_video: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  product_condition: {
    type: DataTypes.ENUM('new', 'used'),
    allowNull: false,
  },
  product_isoff: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  product_offprecentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0.0,
  },
  product_category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  product_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  product_ratings: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  product_review: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  product_color: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  product_size: {
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

Product.beforeUpdate(() => {
  product.updatedAt = new Date();
});

Product.belongsTo(Shop, { foreignKey: 'shop_id' });

module.exports = Product;

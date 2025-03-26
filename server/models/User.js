const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  firstname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('seller', 'buyer'),
    allowNull: false,
  },
  cellphone_no: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  profile_image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address_id: {
    type: DataTypes.UUID,
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

console.log('-------------Model invoked---------------');

User.beforeUpdate(() => {
  user.updatedAt = new Date();
});

module.exports = User;

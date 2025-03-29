'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('shops', {
      shop_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      owner_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id',
        },
      },
      logo: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      banner: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'active', 'suspended'),
        defaultValue: 'pending',
      },
      address: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      contact_info: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      business_hours: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      categories: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      rating: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      total_reviews: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      verification_documents: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('shops');
  }
}; 
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('shop_followers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      shop_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'shops',
          key: 'shop_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

    // Add unique constraint to prevent duplicate follows
    await queryInterface.addConstraint('shop_followers', {
      fields: ['shop_id', 'user_id'],
      type: 'unique',
      name: 'unique_shop_user_follow'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('shop_followers');
  }
}; 
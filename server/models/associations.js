const User = require('./User');
const Shop = require('./shop');
const Product = require('./Product');

function setupAssociations() {
  // Shop belongs to User (owner)
  Shop.belongsTo(User, { 
    foreignKey: 'owner_id',
    as: 'owner'
  });

  // Shop has many Products
  Shop.hasMany(Product, {
    foreignKey: 'shop_id',
    as: 'products'
  });

  // Product belongs to Shop
  Product.belongsTo(Shop, {
    foreignKey: 'shop_id',
    as: 'shop'
  });

  // Shop and User many-to-many relationship for followers
  Shop.belongsToMany(User, {
    through: 'shop_followers',
    as: 'followers',
    foreignKey: 'shop_id',
    otherKey: 'user_id'
  });

  User.belongsToMany(Shop, {
    through: 'shop_followers',
    as: 'followedShops',
    foreignKey: 'user_id',
    otherKey: 'shop_id'
  });
}

module.exports = setupAssociations; 
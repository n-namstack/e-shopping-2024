const sequelize = require('./db');
const { Shop } = require('../models');

// Simplified shop data
const shopData = [
  {
    name: "Electronics Store",
    description: "The best electronics store in town",
    logo: "https://picsum.photos/seed/electronics/200/200",
    banner: "https://picsum.photos/seed/electronics/1200/400",
    status: 'active',
    rating: 4.5,
    total_reviews: 120,
    contact_info: JSON.stringify({
      email: "electronics@example.com",
      phone: "123-456-7890"
    })
  },
  {
    name: "Fashion Boutique",
    description: "Trendy fashion for everyone",
    logo: "https://picsum.photos/seed/fashion/200/200",
    banner: "https://picsum.photos/seed/fashion/1200/400",
    status: 'active',
    rating: 4.2,
    total_reviews: 85,
    contact_info: JSON.stringify({
      email: "fashion@example.com",
      phone: "123-456-7891"
    })
  },
  {
    name: "Home Goods",
    description: "Everything for your home",
    logo: "https://picsum.photos/seed/home/200/200",
    banner: "https://picsum.photos/seed/home/1200/400",
    status: 'active',
    rating: 3.9,
    total_reviews: 67,
    contact_info: JSON.stringify({
      email: "home@example.com",
      phone: "123-456-7892"
    })
  }
];

// Seed the database
const seedShops = async () => {
  try {
    console.log('Starting shop seeding...');
    
    // Check connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Insert shops
    for (const shop of shopData) {
      try {
        // First check if shop already exists by name
        const existingShop = await Shop.findOne({
          where: { name: shop.name }
        });
        
        if (!existingShop) {
          await Shop.create(shop);
          console.log(`Created shop: ${shop.name}`);
        } else {
          console.log(`Shop already exists: ${shop.name}`);
        }
      } catch (shopError) {
        console.error(`Error creating shop ${shop.name}:`, shopError.message);
      }
    }
    
    console.log('Shops seeding complete!');
  } catch (error) {
    console.error('Seeding failed:', error);
  }
};

// Run the seeder
seedShops(); 
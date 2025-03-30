const fs = require('fs');
const path = require('path');
const sequelize = require('./db');
const { User, Shop, Product } = require('../models');

// Load sample data
const productSampleData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'product-sample-date.json'), 'utf8')
);

// Function to extract unique shops from products
const extractShops = (products) => {
  const shopIds = [...new Set(products.map(product => product.shop_id))];
  
  return shopIds.map(shopId => {
    // Use the first product from this shop to create shop details
    const sampleProduct = products.find(p => p.shop_id === shopId);
    
    return {
      shop_id: shopId,
      name: `Shop for ${sampleProduct.product_category}`,
      description: `This is a shop that sells ${sampleProduct.product_category} products`,
      owner_id: 1, // We'll need to ensure this user exists and is a seller
      logo: `https://picsum.photos/seed/${shopId}/200/200`,
      banner: `https://picsum.photos/seed/${shopId}/1200/400`,
      status: 'active',
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'State',
        zipCode: '12345',
        country: 'Country'
      },
      contact_info: {
        email: `shop${shopId.substring(0, 4)}@example.com`,
        phone: '123-456-7890',
        website: `http://shop${shopId.substring(0, 4)}.example.com`
      },
      business_hours: {
        monday: '9:00 AM - 6:00 PM',
        tuesday: '9:00 AM - 6:00 PM',
        wednesday: '9:00 AM - 6:00 PM',
        thursday: '9:00 AM - 6:00 PM',
        friday: '9:00 AM - 6:00 PM',
        saturday: '10:00 AM - 4:00 PM',
        sunday: 'Closed'
      },
      categories: [sampleProduct.product_category],
      rating: (Math.random() * 2 + 3).toFixed(1),  // Random rating between 3 and 5
      total_reviews: Math.floor(Math.random() * 100) + 10 // Random number of reviews
    };
  });
};

// Ensure we have a test seller user
const createTestUser = async () => {
  try {
    const existingUser = await User.findOne({ where: { email: 'seller@example.com' } });
    
    if (!existingUser) {
      return await User.create({
        fullName: 'Test Seller',
        email: 'seller@example.com',
        password: 'password123', // In a real app, this would be hashed
        phone: '123-456-7890',
        role: 'seller',
        is_verified: true,
        approved: true
      });
    }
    
    return existingUser;
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
};

// Seed the database
const seedDatabase = async () => {
  try {
    await sequelize.sync({ force: true }); // Drop tables and recreate them
    
    console.log('Database synced.');
    
    // Create test user
    const testUser = await createTestUser();
    console.log('Test user created:', testUser.email);
    
    // Extract shops from product data
    const shops = extractShops(productSampleData);
    
    // Insert shops
    for (const shop of shops) {
      await Shop.create({
        ...shop,
        owner_id: testUser.user_id
      });
      console.log(`Shop created: ${shop.name}`);
    }
    
    // Insert products
    for (const product of productSampleData) {
      // Format the data to match our schema
      await Product.create({
        product_id: product.product_id || undefined, // Let the DB auto-generate if not provided
        product_name: product.product_name,
        product_description: product.product_description,
        product_price: product.product_price,
        product_image: product.product_image,
        product_imgs: product.product_imgs || [],
        product_video: product.product_video,
        product_condition: product.product_condition?.toLowerCase() || 'new',
        product_isoff: product.product_isoff,
        product_offprecentage: product.product_offprecentage,
        product_category: product.product_category,
        product_quantity: product.product_quantity,
        product_ratings: product.product_ratings,
        product_review: product.product_review?.toString(),
        product_color: product.product_color,
        product_size: product.product_size,
        shop_id: product.shop_id
      });
      console.log(`Product created: ${product.product_name}`);
    }
    
    console.log('Seeding complete!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
};

// Run the seeder
seedDatabase(); 
const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

//Initializing the app
const app = express();
const port = 8000;

//Initialising cors
app.use(cors());
app.use(express.json());

//Connecting to the database
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'eshopping',
  password: 'root',
  port: 5432,
});

// Connect to the database
client
  .connect()
  .then(() => {
    console.log('Connected to PostgreSQL database');
  })
  .catch((err) => console.error('Connection error', err.stack));

// Get shops data endpoint
app.get('/api/shops', async (req, res) => {
  const query = `SELECT e_user.username,shop.shop_uuid, shop.shop_id, shop.shop_name, shop.shop_desc, shop.profile_img, 
                 shop.bg_img, shop.created_at, shop.updated_at, shop.user_id FROM public.shop inner join e_user on e_user.user_id = shop.user_id where shop.user_id = $1;`;

  const user_id = req.query.user_id;

  if (!user_id) {
    return res.status(400).send('user_id is require');
  }

  try {
    const result = await client.query(query, [user_id]);
    res.json(result.rows);
  } catch (err) {
    console.log('Query error', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// Get single shop data endpoint
app.get('/api/shop-info', async (req, res) => {
  const query = `SELECT e_user.username,shop.shop_uuid, shop.shop_id, shop.shop_name, shop.shop_desc, shop.profile_img, 
                 shop.bg_img, shop.created_at, shop.updated_at, shop.user_id FROM public.shop inner join e_user on e_user.user_id = shop.user_id where shop.user_id = $1 and shop_uuid = $2;`;

  const user_id = req.query.user_id;
  const shop_uuid = req.query.shop_uuid;

  if (!user_id && !shop_uuid) {
    return res.status(400).send('user_id and shop_uuid is require');
  }

  try {
    const result = await client.query(query, [user_id, shop_uuid]);
    res.json(result.rows[0]);
  } catch (err) {
    console.log('Query error', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// Create shop andpoint
app.post('/api/create-shop', async (req, res) => {
  const { shop_name, shop_description, profile_img, bg_img, user_id } =
    req.body;

  console.log(req.body);

  if (!shop_name || !shop_description || !profile_img || !bg_img) {
    return res.status(401).send('provide all the required details');
  }
  try {
    const query = `
      INSERT INTO shop(shop_name, shop_desc, profile_img, bg_img, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [shop_name, shop_description, profile_img, bg_img, user_id];
    const result = await client.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Query error', err.stack);
    res.status(500).send('Internal server error');
  }
});

// Create product andpoint
app.post('/api/create-shop', async (req, res) => {
  const { shop_name, shop_description, profile_img, bg_img, user_id } =
    req.body;

  console.log(req.body);

  if (!shop_name || !shop_description || !profile_img || !bg_img) {
    return res.status(401).send('provide all the required details');
  }
  try {
    const query = `
      INSERT INTO shop(shop_name, shop_desc, profile_img, bg_img, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [shop_name, shop_description, profile_img, bg_img, user_id];
    const result = await client.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Query error', err.stack);
    res.status(500).send('Internal server error');
  }
});

// Get public shop data endpoint
app.get('/api/public-shop-info', async (req, res) => {
  try {
    const query = `SELECT e_user.username,shop.shop_uuid, shop.shop_id, shop.shop_name, shop.shop_desc, shop.profile_img,shop.bg_img, 
                  shop.created_at, shop.updated_at, shop.user_id FROM public.shop inner join e_user on e_user.user_id = shop.user_id;`;

    const result = await client.query(query);
    res.json(result.rows);

    console.log(result.rows);
  } catch (err) {
    console.log('Query error', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// Runing the sever on the defined port
app.listen(port, () => {
  console.log(`Running at http://localhost:${port}`);
});

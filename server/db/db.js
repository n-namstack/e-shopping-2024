const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('e_shopping', 'postgres', 'root', {
  host: 'localhost',
  dialect: 'postgres',
  logging: true,
});

// sequelize.sync({ force: true });

sequelize
  .authenticate()
  .then(() => {
    console.log('Successfully connected to database!');
  })
  .catch((err) => {
    console.error('Error connecting to database!', err);
  });

module.exports = sequelize;

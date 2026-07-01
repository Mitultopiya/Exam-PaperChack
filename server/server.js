const app = require('./app');
const { testConnection } = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await testConnection();
    console.log('Connected to MySQL database.');
  } catch (err) {
    console.error('WARNING: Could not connect to MySQL:', err.message);
    console.error('Run `npm run init-db` after configuring .env to set up the database.');
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
})();

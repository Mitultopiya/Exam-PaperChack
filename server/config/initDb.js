/**
 * Database bootstrap script.
 * - Creates the database if it does not exist.
 * - Applies the schema from schema.sql.
 * - Seeds a default admin account using credentials from .env.
 *
 * Run with: npm run init-db
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initDb() {
  const dbName = process.env.DB_NAME || 'smart_answer_evaluation';

  // Connect without a database first so we can create it.
  const rootConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log(`Creating database \`${dbName}\` if needed...`);
  await rootConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await rootConn.changeUser({ database: dbName });

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Applying schema...');
  await rootConn.query(schema);

  // Seed the default admin.
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminName = process.env.ADMIN_NAME || 'Administrator';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const [rows] = await rootConn.query('SELECT id FROM admins WHERE email = ?', [adminEmail]);
  if (rows.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await rootConn.query('INSERT INTO admins (name, email, password) VALUES (?, ?, ?)', [
      adminName,
      adminEmail,
      hash,
    ]);
    console.log(`Seeded default admin: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`Admin ${adminEmail} already exists, skipping seed.`);
  }

  await rootConn.end();
  console.log('Database initialization complete.');
}

initDb().catch((err) => {
  console.error('Database initialization failed:', err.message);
  process.exit(1);
});

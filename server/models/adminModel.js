const { pool } = require('../config/db');

const AdminModel = {
  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM admins WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },
};

module.exports = AdminModel;

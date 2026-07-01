const { pool } = require('../config/db');

const StudentModel = {
  async findAll({ search } = {}) {
    let sql = 'SELECT * FROM students';
    const params = [];
    if (search) {
      sql += ' WHERE name LIKE ? OR email LIKE ? OR enrollment_no LIKE ?';
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create(data) {
    const { name, email, mobile, enrollment_no, course, batch } = data;
    const [result] = await pool.query(
      `INSERT INTO students (name, email, mobile, enrollment_no, course, batch)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, mobile || null, enrollment_no, course || null, batch || null]
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const { name, email, mobile, enrollment_no, course, batch } = data;
    await pool.query(
      `UPDATE students SET name = ?, email = ?, mobile = ?, enrollment_no = ?, course = ?, batch = ?
       WHERE id = ?`,
      [name, email, mobile || null, enrollment_no, course || null, batch || null, id]
    );
    return this.findById(id);
  },

  async remove(id) {
    const [result] = await pool.query('DELETE FROM students WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async count() {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM students');
    return rows[0].total;
  },
};

module.exports = StudentModel;

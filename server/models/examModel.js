const { pool } = require('../config/db');

const ExamModel = {
  async findAll({ search, status } = {}) {
    let sql = 'SELECT * FROM exams';
    const where = [];
    const params = [];
    if (search) {
      where.push('(title LIKE ? OR subject LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like);
    }
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM exams WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create(data) {
    const {
      title,
      subject,
      total_questions,
      total_marks,
      pass_marks,
      negative_mark,
      status,
    } = data;
    const [result] = await pool.query(
      `INSERT INTO exams (title, subject, total_questions, total_marks, pass_marks, negative_mark, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        subject,
        total_questions,
        total_marks,
        pass_marks,
        negative_mark || 0,
        status || 'active',
      ]
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const {
      title,
      subject,
      total_questions,
      total_marks,
      pass_marks,
      negative_mark,
      status,
    } = data;
    await pool.query(
      `UPDATE exams SET title = ?, subject = ?, total_questions = ?, total_marks = ?,
       pass_marks = ?, negative_mark = ?, status = ? WHERE id = ?`,
      [
        title,
        subject,
        total_questions,
        total_marks,
        pass_marks,
        negative_mark || 0,
        status || 'active',
        id,
      ]
    );
    return this.findById(id);
  },

  async setStatus(id, status) {
    await pool.query('UPDATE exams SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  },

  async remove(id) {
    const [result] = await pool.query('DELETE FROM exams WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async count() {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM exams');
    return rows[0].total;
  },
};

module.exports = ExamModel;

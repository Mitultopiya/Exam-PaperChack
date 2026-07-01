const { pool } = require('../config/db');

const SubmissionModel = {
  async create({ student_id, exam_id, uploaded_file }) {
    const [result] = await pool.query(
      'INSERT INTO submissions (student_id, exam_id, uploaded_file) VALUES (?, ?, ?)',
      [student_id, exam_id, uploaded_file || null]
    );
    return result.insertId;
  },

  async count() {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM submissions');
    return rows[0].total;
  },
};

module.exports = SubmissionModel;

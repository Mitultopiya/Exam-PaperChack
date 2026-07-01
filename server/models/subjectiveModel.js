const { pool } = require('../config/db');

/** SubjectiveModel — DB access for AI-evaluated student answer sheet results. */
const SubjectiveModel = {
  async create(data) {
    const {
      master_key_id,
      student_name,
      student_pdf_path,
      marked_pdf_path,
      total_questions,
      correct_count,
      wrong_count,
      percentage,
      status,
      details_json,
    } = data;
    const [result] = await pool.query(
      `INSERT INTO subjective_evaluations
        (master_key_id, student_name, student_pdf_path, marked_pdf_path,
         total_questions, correct_count, wrong_count, percentage, status, details_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        master_key_id,
        student_name || null,
        student_pdf_path,
        marked_pdf_path || null,
        total_questions,
        correct_count,
        wrong_count,
        percentage,
        status,
        JSON.stringify(details_json || []),
      ]
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT se.*, mak.title AS master_title
       FROM subjective_evaluations se
       JOIN master_answer_keys mak ON mak.id = se.master_key_id
       WHERE se.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findAll() {
    const [rows] = await pool.query(
      `SELECT se.*, mak.title AS master_title
       FROM subjective_evaluations se
       JOIN master_answer_keys mak ON mak.id = se.master_key_id
       ORDER BY se.created_at DESC`
    );
    return rows;
  },

  async remove(id) {
    const [res] = await pool.query('DELETE FROM subjective_evaluations WHERE id = ?', [id]);
    return res.affectedRows > 0;
  },
};

module.exports = SubjectiveModel;

const { pool } = require('../config/db');

const AnswerKeyModel = {
  // Returns all answer-key rows for an exam, ordered by question number.
  async findByExam(examId) {
    const [rows] = await pool.query(
      'SELECT * FROM answer_keys WHERE exam_id = ? ORDER BY question_no ASC',
      [examId]
    );
    return rows;
  },

  // Returns a map of { question_no: correct_answer } for fast comparison.
  async getKeyMap(examId) {
    const rows = await this.findByExam(examId);
    const map = {};
    for (const row of rows) {
      map[row.question_no] = row.correct_answer;
    }
    return map;
  },

  // Replaces the entire answer key for an exam in a single transaction.
  async replaceForExam(examId, answers) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM answer_keys WHERE exam_id = ?', [examId]);
      if (answers.length) {
        const values = answers.map((a) => [examId, a.question_no, a.correct_answer]);
        await conn.query(
          'INSERT INTO answer_keys (exam_id, question_no, correct_answer) VALUES ?',
          [values]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    return this.findByExam(examId);
  },

  async updateOne(id, correct_answer) {
    await pool.query('UPDATE answer_keys SET correct_answer = ? WHERE id = ?', [
      correct_answer,
      id,
    ]);
    const [rows] = await pool.query('SELECT * FROM answer_keys WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async removeByExam(examId) {
    const [result] = await pool.query('DELETE FROM answer_keys WHERE exam_id = ?', [examId]);
    return result.affectedRows;
  },

  async countExamsWithKeys() {
    const [rows] = await pool.query(
      'SELECT COUNT(DISTINCT exam_id) AS total FROM answer_keys'
    );
    return rows[0].total;
  },
};

module.exports = AnswerKeyModel;

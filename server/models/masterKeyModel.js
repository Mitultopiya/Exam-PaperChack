const { pool } = require('../config/db');

/** MasterKeyModel — DB access for master answer keys and their Q&A rows. */
const MasterKeyModel = {
  async create({ title, pdf_path, total_questions }) {
    const [result] = await pool.query(
      'INSERT INTO master_answer_keys (title, pdf_path, total_questions) VALUES (?, ?, ?)',
      [title, pdf_path, total_questions]
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM master_answer_keys WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findAll() {
    const [rows] = await pool.query(
      'SELECT * FROM master_answer_keys ORDER BY created_at DESC'
    );
    return rows;
  },

  async remove(id) {
    const [res] = await pool.query('DELETE FROM master_answer_keys WHERE id = ?', [id]);
    return res.affectedRows > 0;
  },

  async saveQuestions(masterKeyId, items) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM master_qa WHERE master_key_id = ?', [masterKeyId]);
      if (items.length) {
        const values = items.map((q) => {
          const meta = q.options
            ? JSON.stringify({ options: q.options, options_text: q.options_text || '' })
            : q.keywords || '';
          const questionText = q.options_text
            ? `${q.question}\n${q.options_text}`
            : q.question;
          return [masterKeyId, q.question_no, questionText, q.answer || '', meta];
        });
        await conn.query(
          'INSERT INTO master_qa (master_key_id, question_no, question, answer, keywords) VALUES ?',
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
  },

  async getQuestions(masterKeyId) {
    const [rows] = await pool.query(
      'SELECT * FROM master_qa WHERE master_key_id = ? ORDER BY question_no ASC',
      [masterKeyId]
    );
    return rows.map((row) => {
      let options = null;
      try {
        if (row.keywords && row.keywords.startsWith('{')) {
          const parsed = JSON.parse(row.keywords);
          options = parsed.options || null;
        }
      } catch {
        /* ignore */
      }
      return { ...row, options };
    });
  },

  async updateTotalQuestions(id, total) {
    await pool.query('UPDATE master_answer_keys SET total_questions = ? WHERE id = ?', [
      total,
      id,
    ]);
  },

  async updateAnswer(masterKeyId, questionNo, answer) {
    await pool.query(
      'UPDATE master_qa SET answer = ? WHERE master_key_id = ? AND question_no = ?',
      [answer, masterKeyId, questionNo]
    );
  },
};

module.exports = MasterKeyModel;

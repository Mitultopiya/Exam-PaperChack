const { pool } = require('../config/db');

const ResultModel = {
  async create(data) {
    const {
      student_id,
      exam_id,
      submission_id,
      correct_answers,
      wrong_answers,
      skipped_answers,
      marks,
      percentage,
      grade,
      status,
      details_json,
    } = data;
    const [result] = await pool.query(
      `INSERT INTO results
        (student_id, exam_id, submission_id, correct_answers, wrong_answers, skipped_answers,
         marks, percentage, grade, status, details_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id,
        exam_id,
        submission_id || null,
        correct_answers,
        wrong_answers,
        skipped_answers,
        marks,
        percentage,
        grade,
        status,
        JSON.stringify(details_json || []),
      ]
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT r.*, s.name AS student_name, s.enrollment_no, s.email AS student_email,
              s.course, s.batch, e.title AS exam_title, e.subject, e.total_questions,
              e.total_marks, e.pass_marks
       FROM results r
       JOIN students s ON s.id = r.student_id
       JOIN exams e ON e.id = r.exam_id
       WHERE r.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findAll(filters = {}) {
    const { search, exam_id, subject, result, dateFrom, dateTo, minPercentage } = filters;
    let sql = `SELECT r.*, s.name AS student_name, s.enrollment_no, e.title AS exam_title, e.subject
               FROM results r
               JOIN students s ON s.id = r.student_id
               JOIN exams e ON e.id = r.exam_id`;
    const where = [];
    const params = [];

    if (search) {
      where.push('(s.name LIKE ? OR s.enrollment_no LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (exam_id) {
      where.push('r.exam_id = ?');
      params.push(exam_id);
    }
    if (subject) {
      where.push('e.subject = ?');
      params.push(subject);
    }
    if (result) {
      where.push('r.status = ?');
      params.push(result);
    }
    if (dateFrom) {
      where.push('r.created_at >= ?');
      params.push(`${dateFrom} 00:00:00`);
    }
    if (dateTo) {
      where.push('r.created_at <= ?');
      params.push(`${dateTo} 23:59:59`);
    }
    if (minPercentage) {
      where.push('r.percentage >= ?');
      params.push(minPercentage);
    }

    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY r.created_at DESC';

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async setPdfPath(id, pdfPath) {
    await pool.query('UPDATE results SET pdf_path = ? WHERE id = ?', [pdfPath, id]);
  },

  async remove(id) {
    const [res] = await pool.query('DELETE FROM results WHERE id = ?', [id]);
    return res.affectedRows > 0;
  },

  async count() {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM results');
    return rows[0].total;
  },

  async countByStatus() {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) AS total FROM results GROUP BY status`
    );
    const out = { pass: 0, fail: 0 };
    rows.forEach((r) => (out[r.status] = r.total));
    return out;
  },

  // Daily evaluation counts for the last N days.
  async dailyCounts(days = 7) {
    const [rows] = await pool.query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS total
       FROM results
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
      [days]
    );
    return rows;
  },

  // Per-exam evaluation statistics for charts.
  async examStats() {
    const [rows] = await pool.query(
      `SELECT e.title AS exam_title, COUNT(r.id) AS evaluations,
              SUM(CASE WHEN r.status = 'pass' THEN 1 ELSE 0 END) AS passed
       FROM exams e
       LEFT JOIN results r ON r.exam_id = e.id
       GROUP BY e.id
       ORDER BY evaluations DESC
       LIMIT 8`
    );
    return rows;
  },

  async recent(limit = 6) {
    const [rows] = await pool.query(
      `SELECT r.id, r.marks, r.percentage, r.status, r.created_at,
              s.name AS student_name, e.title AS exam_title
       FROM results r
       JOIN students s ON s.id = r.student_id
       JOIN exams e ON e.id = r.exam_id
       ORDER BY r.created_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  },
};

module.exports = ResultModel;

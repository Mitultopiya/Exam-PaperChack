// Generic helpers shared across the backend.

// Wraps async route handlers so thrown errors flow to the error middleware.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Lightweight error with an attached HTTP status code.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Maps a percentage to a letter grade.
function computeGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 40) return 'E';
  return 'F';
}

// Normalizes an answer value for comparison (uppercase, trimmed).
function normalizeAnswer(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toUpperCase();
}

module.exports = { asyncHandler, ApiError, computeGrade, normalizeAnswer };

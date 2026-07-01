// Central error handler. Converts thrown errors into JSON responses.
function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    console.error(err);
  }
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
}

// 404 fallback for unmatched routes.
function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };

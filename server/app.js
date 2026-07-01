const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const apiRoutes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// --- Global middleware ---
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Static access to generated PDFs (optional convenience).
app.use('/pdf', express.static(path.join(__dirname, 'pdf')));

// --- API routes ---
app.use('/api', apiRoutes);

// --- Error handling ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;

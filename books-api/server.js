const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import Firebase config
const admin = require('./config/firebase');

// Import routes
const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const recommendationsRoutes = require('./routes/recommendations');
const listsRoutes = require('./routes/lists');
const publicListsRoutes = require('./routes/publicLists');

// Middleware
const authenticate = require('./middleware/authenticate');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedRenderPreview = /^https:\/\/bookfinder-web(?:-[a-z0-9]+)?\.onrender\.com$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || allowedRenderPreview.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/recommendations', authenticate, recommendationsRoutes);
app.use('/api/lists', authenticate, listsRoutes);
app.use('/api/public-lists', publicListsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Book API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Book Suggestion API running on http://localhost:${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/health\n`);
});

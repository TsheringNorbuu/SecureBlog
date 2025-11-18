import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import securityConfig from './config/security.js';
import logger from './config/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import adminRoutes from './routes/admin.js';

dotenv.config(); // Load environment variables

const app = express();

// Security configuration
securityConfig(app);

// Database connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => logger.info('MongoDB connected successfully'))
  .catch((err) => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// =========================
//  FRONTEND STATIC SERVING
// =========================

// Proper path resolution for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve React build folder in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));

  // React SPA fallback for all non-API routes
  app.get('*', (req, res, next) => {
    // If it's an API route, skip to next middleware (404 or handler)
    if (req.originalUrl.startsWith('/api')) return next();

    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// =========================
//     404 HANDLER
// =========================
app.all('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    res.status(404).json({
      status: 'fail',
      message: `Can't find ${req.originalUrl} on this server`,
    });
  } else {
    // For non-API routes in production, this should not be reached due to static serving
    res.status(404).send('Page not found');
  }
});

// Global error handler
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  if (process.env.NODE_ENV === 'production') {
    res.status(err.statusCode).json({
      status: err.status,
      message: 'Something went wrong!',
    });
  } else {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(
    `Server running on port ${PORT} (${process.env.NODE_ENV || 'production'} mode)`
  );
});

export default app;
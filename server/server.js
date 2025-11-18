// DEBUG: Add this at the VERY TOP
console.log('=== DEBUG: Server starting ===');
console.log('Node version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('MONGODB_URI (first part):', process.env.MONGODB_URI ? process.env.MONGODB_URI.split('@')[0] + '...' : 'NOT SET');
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('=== DEBUG: Finished environment check ===');

// Regular imports at top level
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

console.log('All imports successful');

// Now the main application with error handling
try {
  console.log('=== Starting main application ===');
  
  dotenv.config(); // Load environment variables

  const app = express();
  console.log('Express app created');

  // Security configuration
  console.log('Configuring security...');
  securityConfig(app);
  console.log('Security configured');

  // Database connection
  console.log('Connecting to MongoDB...');
  mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log('MongoDB connected successfully');
      logger.info('MongoDB connected successfully');
    })
    .catch((err) => {
      console.log('MongoDB connection FAILED:', err.message);
      logger.error('MongoDB connection error:', err);
      process.exit(1);
    });

  // API Routes
  console.log('Setting up routes...');
  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/admin', adminRoutes);
  console.log('Routes configured');

  // Health check
  app.get('/api/health', (req, res) => {
    console.log('Health check called');
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
    console.log('Setting up static file serving for React...');
    app.use(express.static(path.join(__dirname, '../client/build')));

    // React SPA fallback for all non-API routes
    app.get('*', (req, res, next) => {
      // If it's an API route, skip to next middleware (404 or handler)
      if (req.originalUrl.startsWith('/api')) return next();

      res.sendFile(path.join(__dirname, '../client/build/index.html'));
    });
    console.log('Static file serving configured');
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
    console.log('Unhandled error:', err.message);
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
    console.log(`=== SUCCESS: Server running on port ${PORT} ===`);
    logger.info(
      `Server running on port ${PORT} (${process.env.NODE_ENV || 'production'} mode)`
    );
  });

  console.log('=== Server setup complete ===');

} catch (error) {
  console.log('=== CRASH DETECTED IN MAIN APP ===');
  console.log('Error:', error.message);
  console.log('Stack:', error.stack);
  process.exit(1);
}

export default app;
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables FIRST
dotenv.config();

console.log('=== Server starting ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);

const app = express();

// =========================
//  BASIC ERROR HANDLING MIDDLEWARE (Add this FIRST)
// =========================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// =========================
//  DATABASE CONNECTION WITH PROPER ERROR HANDLING
// =========================
if (!process.env.MONGODB_URI) {
  console.error('FATAL: MONGODB_URI environment variable is not set');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    console.log('Please check:');
    console.log('1. MongoDB Atlas IP whitelist (0.0.0.0/0)');
    console.log('2. Database user password');
    console.log('3. Connection string format');
    process.exit(1);
  });

// =========================
//  SECURITY CONFIGURATION (with error handling)
// =========================
try {
  const securityConfig = await import('./config/security.js');
  securityConfig.default(app);
  console.log('Security configured');
} catch (error) {
  console.error('Security config error:', error.message);
  // Continue without security if config fails
}

// =========================
//  ROUTES (with error handling)
// =========================
try {
  const authRoutes = await import('./routes/auth.js');
  const postRoutes = await import('./routes/posts.js');
  const adminRoutes = await import('./routes/admin.js');
  
  app.use('/api/auth', authRoutes.default);
  app.use('/api/posts', postRoutes.default);
  app.use('/api/admin', adminRoutes.default);
  console.log('Routes configured');
} catch (error) {
  console.error('Route import error:', error.message);
}

// =========================
//  HEALTH CHECK
// =========================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// =========================
//  FRONTEND STATIC SERVING
// =========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  try {
    app.use(express.static(path.join(__dirname, '../client/build')));
    
    app.get('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      res.sendFile(path.join(__dirname, '../client/build/index.html'));
    });
    console.log('Static file serving configured');
  } catch (error) {
    console.error('Static file serving error:', error.message);
  }
}

// =========================
//  404 HANDLER
// =========================
app.all('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    res.status(404).json({
      status: 'fail',
      message: `Can't find ${req.originalUrl} on this server`,
    });
  } else {
    res.status(404).send('Page not found');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=== SUCCESS: Server running on port ${PORT} ===`);
  console.log(`=== Access your app at: http://localhost:${PORT} ===`);
});


// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

export default app;

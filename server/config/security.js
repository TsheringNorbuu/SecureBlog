import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP
  message: 'Too many requests from this IP, please try again later.'
});

// OTP rate limiting (stricter)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many OTP requests, please try again later.'
});

const configureSecurity = (app) => {
  // Trust proxy (important for deployment platforms)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // CORS - Updated for production
  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, server-to-server)
        if (!origin) return callback(null, true);
        
        // Development origins
        const devOrigins = [
          "https://secureblog.railway.app"
          'http://localhost:3000',
          'http://localhost:3001', 
          'http://localhost:3002',
          'https://localhost:3000',
          'https://localhost:3001',
          'https://localhost:3002',
          'https://localhost:3443'
        ];
        
        // Production origins - add your deployed frontend URLs here
        const productionOrigins = [
          process.env.FRONTEND_URL,
          process.env.CLIENT_URL,
          'https://your-app-name.railway.app', // replace with your actual URL
          'https://your-app-name.netlify.app'  // if deploying client separately
        ].filter(Boolean);

        const allowedOrigins = [
          ...devOrigins,
          ...productionOrigins
        ];

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.log('Blocked by CORS:', origin);
          callback(new Error(`CORS policy: origin ${origin} not allowed`));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200,
    })
  );

  // Rate limiting
  app.use('/api/', limiter);
  app.use('/api/auth/verify-otp', otpLimiter);

  // Data sanitization
  app.use(mongoSanitize());
  app.use(xss());

  // Prevent parameter pollution
  app.use(hpp());

  // Body parser with size limit
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
};

export default configureSecurity;
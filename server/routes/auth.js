import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import { sendOTP } from '../services/otpService.js';
import { validateRegistration, validateLogin } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

// Generate secure OTP
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

// ----- Helper to log and respond -----
const handleError = (res, message, error = null, statusCode = 500) => {
  if (error) logger.error(message, { error: error.stack });
  else logger.error(message);
  res.status(statusCode).json({ status: 'error', message });
};

// ----- Register -----
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = 'Registration validation failed';
      logger.warn(msg, { errors: errors.array() });
      return res.status(400).json({ status: 'fail', message: msg, errors: errors.array() });
    }

    const { username, email, password, role = 'reader' } = req.body;

    // Prevent admin self-registration in production
    if (role === 'admin' && process.env.NODE_ENV === 'production') {
      logger.warn('Admin registration attempt blocked in production', { email, username });
      return res.status(403).json({ 
        status: 'fail', 
        message: 'Admin registration is not allowed' 
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const msg = 'User with this email or username already exists';
      logger.warn('Registration failed: user exists', { email, username });
      return res.status(400).json({ status: 'fail', message: msg });
    }

    const newUser = await User.create({ 
      username, 
      email, 
      password, 
      role 
    });

    // Generate OTP
    const otpCode = generateOTP();
    newUser.otp = { 
      code: otpCode, 
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    await newUser.save();
    
    // Send OTP (with error handling for email service)
    try {
      await sendOTP(email, otpCode);
      logger.info('OTP sent successfully', { email });
    } catch (emailError) {
      logger.error('Failed to send OTP email', { email, error: emailError });
      // Don't fail registration if email fails, but log it
    }

    logger.info('User registered successfully', { 
      email, 
      username, 
      userId: newUser._id 
    });
    
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully. Please check your email for OTP verification.',
    });
  } catch (error) {
    handleError(res, 'Internal server error during registration', error);
  }
});

// ----- Verify OTP -----
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      const msg = 'Email and OTP are required';
      logger.warn('OTP verification failed: missing email or otp', { email });
      return res.status(400).json({ status: 'fail', message: msg });
    }

    const user = await User.findOne({ email });
    if (!user) {
      const msg = 'User not found';
      logger.warn('OTP verification failed: user not found', { email });
      return res.status(404).json({ status: 'fail', message: msg });
    }

    if (!user.otp || user.otp.code !== otp) {
      const msg = 'Invalid OTP';
      logger.warn('OTP verification failed: invalid OTP', { email });
      return res.status(400).json({ status: 'fail', message: msg });
    }

    if (user.otp.expiresAt < new Date()) {
      const msg = 'OTP has expired';
      logger.warn('OTP verification failed: expired OTP', { email });
      return res.status(400).json({ status: 'fail', message: msg });
    }

    // Mark user as verified and clear OTP
    user.isVerified = true;
    user.otp = undefined;
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ 
      id: user._id, 
      role: user.role 
    }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d', // Longer expiry for production
    });

    // Set cookie (works in production with proper CORS)
    res.cookie('jwt', token, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', // For cross-site in production
    });

    logger.info('User verified successfully', { 
      email, 
      userId: user._id 
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Account verified successfully',
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      },
    });
  } catch (error) {
    handleError(res, 'Internal server error during OTP verification', error);
  }
});

// ----- Login -----
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = 'Login validation failed';
      logger.warn(msg, { errors: errors.array() });
      return res.status(400).json({ status: 'fail', message: msg, errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      const msg = 'Incorrect email or password';
      logger.warn('Login failed: incorrect credentials', { email });
      return res.status(401).json({ status: 'fail', message: msg });
    }

    if (!user.isVerified) {
      // Optionally resend OTP for unverified users
      const msg = 'Please verify your account with OTP first';
      logger.warn('Login failed: unverified account', { email });
      return res.status(401).json({ 
        status: 'fail', 
        message: msg,
        requiresVerification: true 
      });
    }

    const token = jwt.sign({ 
      id: user._id, 
      role: user.role 
    }, process.env.JWT_SECRET, { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
    });

    res.cookie('jwt', token, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    });

    logger.info('User logged in successfully', { 
      email, 
      userId: user._id,
      role: user.role 
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      },
    });
  } catch (error) {
    handleError(res, 'Internal server error during login', error);
  }
});

// ----- Logout -----
router.post('/logout', (req, res) => {
  try {
    res.cookie('jwt', 'loggedout', {
      expires: new Date(Date.now() + 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    });

    logger.info('User logged out', { 
      userId: req.user?._id 
    });
    
    res.status(200).json({ 
      status: 'success', 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    handleError(res, 'Internal server error during logout', error);
  }
});

// ----- Resend OTP -----
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'User not found' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'User is already verified' 
      });
    }

    // Generate new OTP
    const otpCode = generateOTP();
    user.otp = { 
      code: otpCode, 
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) 
    };
    await user.save();

    try {
      await sendOTP(email, otpCode);
      logger.info('OTP resent successfully', { email });
    } catch (emailError) {
      logger.error('Failed to resend OTP email', { email, error: emailError });
    }

    res.status(200).json({
      status: 'success',
      message: 'OTP resent successfully',
    });
  } catch (error) {
    handleError(res, 'Internal server error during OTP resend', error);
  }
});

export default router;
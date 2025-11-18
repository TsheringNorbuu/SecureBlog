import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // Use app password for Gmail
  },
});

// Test the transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ SMTP configuration error:', error.message);
    console.log('💡 Emails will be logged to console instead');
  } else {
    console.log('✅ SMTP server is ready to send emails');
  }
});

// OTP storage
const otpStore = new Map();

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTP = async (email, otpCode) => {
  try {
    // Store OTP with expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    otpStore.set(email, { code: otpCode, expiresAt });

    const mailOptions = {
      from: process.env.OTP_EMAIL || 'Secure Blog <noreply@secureblog.com>',
      to: email,
      subject: 'Your OTP Code - Secure Blog',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; }
                .otp-code { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; letter-spacing: 8px; }
                .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
                .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Secure Blog</h1>
                    <p>Account Verification</p>
                </div>
                <div class="content">
                    <h2>Hello!</h2>
                    <p>Thank you for registering with Secure Blog. Please use the following One-Time Password (OTP) to verify your account:</p>
                    
                    <div class="otp-code">${otpCode}</div>
                    
                    <div class="warning">
                        <strong>Important:</strong> This OTP will expire in 10 minutes. Do not share this code with anyone.
                    </div>
                    
                    <p>If you didn't request this verification, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 Secure Blog. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    // Try to send email via SMTP
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
    
    return { 
      success: true, 
      message: 'OTP sent successfully',
      messageId: info.messageId 
    };

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    
    // Fallback: Log OTP to console for development
    console.log('='.repeat(70));
    console.log('📧 SECURE BLOG - OTP VERIFICATION (FALLBACK)');
    console.log('='.repeat(70));
    console.log(`To: ${email}`);
    console.log(`OTP Code: ${otpCode}`);
    console.log(`Expires: 10 minutes`);
    console.log('='.repeat(70));
    console.log('💡 Email service unavailable. Use this OTP for verification.');
    console.log('='.repeat(70));
    
    return { 
      success: true, 
      message: 'OTP logged to console (email service unavailable)',
      fallback: true 
    };
  }
};

export const verifyOTP = (email, otp) => {
  const storedData = otpStore.get(email);
  
  if (!storedData) {
    return { valid: false, message: 'OTP not found. Please request a new one.' };
  }
  
  if (storedData.expiresAt < new Date()) {
    otpStore.delete(email);
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }
  
  if (storedData.code !== otp) {
    return { valid: false, message: 'Invalid OTP code.' };
  }
  
  // OTP is valid - remove it from storage
  otpStore.delete(email);
  return { valid: true, message: 'OTP verified successfully' };
};

// Clean up expired OTPs every minute
setInterval(() => {
  const now = new Date();
  let cleaned = 0;
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired OTPs`);
  }
}, 60 * 1000);
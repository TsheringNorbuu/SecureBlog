import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    const existingAdmin = await User.findOne({ email: 'admin@secureblog.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Skipping creation.');
      return;
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error("ADMIN_PASSWORD is not set in .env");
    }

    // Pass plain password here, Mongoose pre-save will hash it
    const adminUser = new User({
      username: 'admin',
      email: 'admin@secureblog.com',
      password: adminPassword,
      role: 'admin',
      isVerified: true
    });

    await adminUser.save();

    console.log('Admin user created successfully!');
    console.log('Email: admin@secureblog.com');
    console.log('Password: (hidden)');
  } 
  catch (error) {
    console.error('Error seeding admin:', error);
  } 
  finally {
    await mongoose.connection.close();
  }
};

seedAdmin();

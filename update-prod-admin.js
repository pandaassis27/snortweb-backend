import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Admin from './models/Admin.js';

dotenv.config();

const updateAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB.');

    // Search for existing admin
    const admin = await Admin.findOne({ 
      $or: [
        { email: 'admin@snortweb.com' },
        { email: 'admin@snortwebtechnology.com' },
        { username: 'admin' }
      ]
    });

    if (!admin) {
      console.log('Admin user not found. Cannot update.');
      process.exit(1);
    }

    console.log('Found existing admin:', admin.email);

    // Update fields
    admin.email = 'admin@snortwebtechnology.com';
    admin.username = 'admin';
    admin.password = '2222062719'; // The schema pre('save') hook will hash it, OR we hash it manually if using updateOne

    // We will save using admin.save() so the pre('save') hook hashes the new password
    await admin.save();
    console.log('Admin account updated successfully!');

    // Verification steps
    console.log('\n--- VERIFICATION ---');
    
    // 1. Email lookup
    const lookupByEmail = await Admin.findOne({ email: 'admin@snortwebtechnology.com' });
    console.log('Email lookup works:', !!lookupByEmail);

    // 2. Username lookup
    const lookupByUsername = await Admin.findOne({ username: 'admin' });
    console.log('Username lookup works:', !!lookupByUsername);

    // 3. bcrypt.compare
    const isMatch = await lookupByEmail.comparePassword('2222062719');
    console.log('bcrypt.compare() returns true:', isMatch);

    process.exit(0);
  } catch (error) {
    console.error('Database connection or update failed:', error.message);
    process.exit(1);
  }
};

updateAdmin();

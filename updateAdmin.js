import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

const updateAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const email = 'admin@snortweb.com';
    const password = 'snort@@web@@technology!!';
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update or create the admin
    const admin = await Admin.findOneAndUpdate(
      { email },
      { 
        username: 'admin',
        password: hashedPassword,
        role: 'superadmin'
      },
      { upsert: true, new: true }
    );

    console.log('Successfully updated/created admin:', admin.email);
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin:', error);
    process.exit(1);
  }
};

updateAdmin();

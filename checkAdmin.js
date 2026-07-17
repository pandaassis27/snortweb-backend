import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

const checkDb = async () => {
  try {
    console.log('Connecting to MongoDB...', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected!');
    
    const admin = await Admin.findOne({ email: 'admin@snortweb.com' });
    if (admin) {
      console.log('Admin found:', admin.email);
      console.log('Password hash:', admin.password);
      
      const isMatch1 = await admin.comparePassword('admin123');
      console.log('Matches admin123?', isMatch1);
      
      const isMatch2 = await admin.comparePassword('snort@@web@@technology!!');
      console.log('Matches snort@@web@@technology!!?', isMatch2);
    } else {
      console.log('Admin not found in DB!');
    }
    process.exit(0);
  } catch (error) {
    console.error('Connection failed:', error.message);
    process.exit(1);
  }
};

checkDb();

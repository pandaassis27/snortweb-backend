import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

const auditDb = async () => {
  console.log('--- Environment Verification ---');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
  console.log('MONGO_URI present:', !!process.env.MONGO_URI);
  if (process.env.MONGO_URI) {
    const maskedUri = process.env.MONGO_URI.replace(/:([^:@]+)@/, ':***@');
    console.log('MONGO_URI (Masked):', maskedUri);
  }
  
  // Seed Verification (checking local config db.js)
  console.log('\n--- Seed Verification ---');
  try {
    const dbJsPath = path.join(process.cwd(), 'config', 'db.js');
    const dbJsContent = fs.readFileSync(dbJsPath, 'utf-8');
    if (dbJsContent.includes('admin@snortweb.com')) {
      console.log('Seeded admin email expected: admin@snortweb.com');
    }
  } catch (err) {
    console.log('Could not read config/db.js for seed info');
  }

  console.log('\n--- Database Verification ---');
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB successfully!');
    
    const count = await Admin.countDocuments();
    console.log('Total admin users in DB:', count);
    
    const admins = await Admin.find({}).select('-password');
    admins.forEach(admin => {
      console.log(`- Username: ${admin.username} | Email: ${admin.email} | Role: ${admin.role} | isActive: ${admin.isActive !== undefined ? admin.isActive : 'Not defined in schema'}`);
    });

    console.log('\nAudit completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('\n[CRITICAL FAILURE] Database connection failed:', error.message);
    console.error('Root Cause: Your local machine is unable to reach the MongoDB Atlas cluster. This is typically caused by IP Whitelisting restrictions in MongoDB Atlas network access, or an ISP blocking port 27017/DNS resolution.');
    process.exit(1);
  }
};

auditDb();

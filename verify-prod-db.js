import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Admin from './models/Admin.js';

dotenv.config();

const verifyDb = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected!');

    const count = await Admin.countDocuments();
    console.log('\n--- MongoDB Admin Users ---');
    console.log('Total admin users:', count);

    const admins = await Admin.find({});
    admins.forEach(admin => {
      console.log(`Email: ${admin.email}`);
      console.log(`Username: ${admin.username}`);
      console.log(`Role: ${admin.role}`);
      console.log(`isActive: ${admin.isActive !== undefined ? admin.isActive : 'Not defined'}`);
      console.log(`createdAt: ${admin.createdAt || 'Unknown'}`);
      console.log('---------------------------');
    });

    console.log('\n--- Searching for admin@snortweb.com ---');
    const targetAdmin = admins.find(a => a.email === 'admin@snortweb.com');

    if (!targetAdmin) {
      console.log('Admin user not found.');
      process.exit(0);
    }

    const isMatch = await bcrypt.compare('admin123', targetAdmin.password);
    console.log('Password Match:', isMatch ? 'YES' : 'NO');

    if (!isMatch) {
      console.log('\nResetting production admin password to: admin123');
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash('admin123', salt);
      
      // Update only the existing user, bypassing pre('save') to avoid double hashing if using updateOne
      // Or use targetAdmin.password = 'admin123' and targetAdmin.save() which triggers pre('save').
      // Wait, in Admin.js pre('save') hashes it if it is modified.
      targetAdmin.password = 'admin123';
      await targetAdmin.save();
      
      console.log('Password reset successfully!');
      
      // Verify again just in case
      const updatedAdmin = await Admin.findById(targetAdmin._id);
      const isMatchAgain = await bcrypt.compare('admin123', updatedAdmin.password);
      console.log('Verification after reset - Password Match:', isMatchAgain ? 'YES' : 'NO');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

verifyDb();

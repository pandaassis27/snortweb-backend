import dotenv from 'dotenv';
dotenv.config();

const validateEnv = () => {
  const requiredVars = [
    'JWT_SECRET',
    'MONGO_URI',
  ];

  if (process.env.NODE_ENV === 'production') {
    requiredVars.push('FRONTEND_URL', 'ADMIN_URL');
  }

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missing.join(', ')}`);
    console.error(`Please provide MONGO_URI (e.g. MongoDB Atlas URI) in the .env file.`);
    process.exit(1);
  }

  // If localhost is detected, we will intercept it in db.js and spin up a memory server
  if (process.env.MONGO_URI && (process.env.MONGO_URI.includes('localhost') || process.env.MONGO_URI.includes('127.0.0.1'))) {
    console.warn(`WARNING: Localhost MongoDB URI detected. Will attempt to use in-memory real MongoDB server if local instance is down.`);
  }

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5050,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET || 'snortweb_super_secret_jwt_key_12345',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    adminUrl: process.env.ADMIN_URL || 'http://localhost:5173', // Adjust default if needed
  };
};

export const envConfig = validateEnv();

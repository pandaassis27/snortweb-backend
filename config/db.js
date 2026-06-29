import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/snortweb", {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    process.env.USE_MOCK_DB = "false";
  } catch (error) {
    console.warn(`==================================================`);
    console.warn(`DATABASE ERROR: ${error.message}`);
    console.warn(`MongoDB is not running at ${process.env.MONGO_URI || "mongodb://localhost:27017/snortweb"}`);
    console.warn(`FALLING BACK TO IN-MEMORY MOCK DATABASE!`);
    console.warn(`All additions/updates will be kept in memory.`);
    console.warn(`==================================================`);
    process.env.USE_MOCK_DB = "true";
  }
};

export default connectDB;

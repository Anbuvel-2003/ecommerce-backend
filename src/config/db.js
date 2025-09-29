// import mongoose from "mongoose";

// const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(process.env.MONGO_URI);
//     console.log('====================================');
//     console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
//     console.log('====================================');
//   } catch (err) {
//     console.log(err, "Error Message");
//   }
// };

// export default connectDB;

import mongoose from "mongoose";

const connectDB = async () => {
  try {
    console.log("🔄 Attempting to connect to MongoDB...");
    console.log("MongoDB URI:", process.env.MONGO_URI ? "Found" : "❌ NOT FOUND");
    
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
    
    // Connection event listeners
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
  } catch (error) {
    console.error("❌ MongoDB connection failed:");
    console.error("Error message:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
};

export default connectDB;
import mongoose from 'mongoose';

/**
 * Connects to MongoDB Atlas
 */
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables.');
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      family: 4, // Force IPv4 to prevent IPv6 ECONNREFUSED errors during SRV resolution
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

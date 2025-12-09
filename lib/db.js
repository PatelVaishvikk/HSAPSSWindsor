import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// Environment check moved to connectDb

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDb() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) {
            throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
        }

        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 30000, // Increased to 30s
            socketTimeoutMS: 60000, // Increased to 60s
            connectTimeoutMS: 30000, // Explicitly set connect timeout
            family: 4, // Force IPv4 to avoid dual-stack issues
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log('Connected to MongoDB successfully');
            return mongoose;
        }).catch((error) => {
            console.error('MongoDB connection error:', error);
            cached.promise = null; // Clear the promise so we can try again
            throw error;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default connectDb; 
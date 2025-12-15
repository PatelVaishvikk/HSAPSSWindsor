
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

// Define minimal Schema
const studentSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: String,
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
}, { strict: false });

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

async function fixFollows() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the specific user (Vaishvik) - assuming based on previous context or just find the one with the issue
    // Since we don't have the ID handy, we can search by name or look for any student with mismatch
    const students = await Student.find({}).lean();
    
    for (const student of students) {
        if (!student.following || student.following.length === 0) continue;

        const validFollowing = await Student.countDocuments({
            _id: { $in: student.following }
        });

        if (validFollowing !== student.following.length) {
            console.log(`Mismatch found for ${student.first_name} ${student.last_name}:`);
            console.log(`- Stored Count: ${student.following.length}`);
            console.log(`- Valid Users Found: ${validFollowing}`);
            
            // Fix it
            const ValidUsers = await Student.find({ _id: { $in: student.following } }).select('_id');
            const validIds = ValidUsers.map(u => u._id);
            
            await Student.updateOne(
                { _id: student._id },
                { $set: { following: validIds } }
            );
            console.log(`-> Fixed. New count: ${validIds.length}`);
        }
        
        // Also check followers for symmetry if needed, but user specifically mentioned 'following' count
    }

    console.log('Done checking all students.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixFollows();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Group from './models/Group.js';
import GroupMessage from './models/GroupMessage.js';
import Student from './models/Student.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function verifyGroups() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Find a test student
    const student = await Student.findOne();
    if (!student) {
      console.error('No students found to test with.');
      process.exit(1);
    }
    console.log(`Testing with student: ${student.first_name} (${student._id})`);

    // 2. Create a Group
    console.log('Creating test group...');
    const group = await Group.create({
      name: 'Test Group ' + Date.now(),
      description: 'A temporary test group',
      created_by: student._id,
      admins: [student._id],
      members: [student._id]
    });
    console.log(`Group created: ${group.name} (${group._id})`);

    // 3. Send a Message
    console.log('Sending message...');
    const message = await GroupMessage.create({
      group: group._id,
      sender: student._id,
      content: 'Hello World from Verification Script!'
    });
    console.log(`Message sent: ${message.content}`);

    // 4. Fetch Messages
    console.log('Fetching messages...');
    const messages = await GroupMessage.find({ group: group._id }).populate('sender', 'first_name');
    if (messages.length > 0 && messages[0].content === 'Hello World from Verification Script!') {
      console.log('SUCCESS: Message fetched correctly.');
    } else {
      console.error('FAILURE: Message not found or incorrect.');
    }

    // Cleanup
    console.log('Cleaning up...');
    await GroupMessage.deleteMany({ group: group._id });
    await Group.findByIdAndDelete(group._id);
    console.log('Cleanup complete.');

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

verifyGroups();

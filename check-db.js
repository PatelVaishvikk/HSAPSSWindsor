import connectDb from './lib/db.js';
import Student from './models/Student.js';

async function checkDb() {
  console.log('Attempting to connect to DB...');
  try {
    await connectDb();
    console.log('DB Connected!');
    
    const count = await Student.countDocuments();
    console.log(`Found ${count} students.`);
    
    const students = await Student.find({}, 'phone first_name last_name portal_password_hash');
    console.log('Students:', JSON.stringify(students, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('DB Connection Failed:', err);
    process.exit(1);
  }
}

checkDb();

import connectDb from '../lib/db.js';
import Student from '../models/Student.js';

async function findStudent() {
  try {
    await connectDb();
    const student = await Student.findOne({}, 'phone first_name last_name');
    if (student) {
      console.log(`Phone: ${student.phone}`);
      console.log(`Name: ${student.first_name} ${student.last_name}`);
    } else {
      console.log('No students found.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findStudent();

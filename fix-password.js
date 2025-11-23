import connectDb from './lib/db.js';
import Student from './models/Student.js';

async function fixStudentPassword() {
  console.log('Connecting to DB...');
  await connectDb();
  
  const phone = '5199927920';
  console.log(`Looking for student with phone: ${phone}`);
  
  const student = await Student.findOne({ phone });
  
  if (!student) {
    console.log('Student not found!');
    process.exit(1);
  }
  
  console.log('Student found:', student.first_name, student.last_name);
  console.log('Has password hash:', Boolean(student.portal_password_hash));
  
  if (student.portal_password_hash) {
    console.log('Hash type:', student.portal_password_hash.substring(0, 10));
    
    // Remove the password hash so they can use default password
    student.portal_password_hash = null;
    student.portal_password_set_at = null;
    await student.save();
    
    console.log('Password hash removed! Student can now login with default password: dasnadas');
  } else {
    console.log('Student has no custom password. Can login with default password: dasnadas');
  }
  
  process.exit(0);
}

fixStudentPassword().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

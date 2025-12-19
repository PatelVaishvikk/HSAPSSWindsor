import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const StudentSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  phone: String,
  study_program: String,
  employment_status: String,
  employment_role: String,
  community_headline: String,
  graduation_completed: Boolean,
  available_to_help: Boolean,
  community_visibility: String,
  education: String
}, { strict: false });

const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const viewer = await Student.findOne({ phone: '5199927920' });
  if (!viewer) {
    console.log('Viewer not found');
    process.exit(1);
  }

  // Ensure Dhruv is a high-value IT Professional
  await Student.updateOne(
    { phone: '6475252920' }, // Dhruv
    {
      $set: {
        community_headline: 'Senior Software Engineer | Cloud Architect',
        employment_status: 'Working',
        employment_role: 'Senior Software Engineer',
        available_to_help: true,
        community_visibility: 'public'
      }
    }
  );

  // Ensure Satyapal is a student/grad but not IT Job holder
  await Student.updateOne(
    { phone: '2262021099' }, // Satyapal
    {
      $set: {
        community_headline: 'Aspiring Engineer | Graduate Student',
        employment_status: 'Seeking Opportunities',
        employment_role: '',
        study_program: 'meng',
        available_to_help: true,
        community_visibility: 'public'
      }
    }
  );

  console.log('Final Professional Data Synced. Ready for Expert Edition test.');
  process.exit(0);
}

verify();

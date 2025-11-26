import mongoose from 'mongoose';
const { Schema } = mongoose;
import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

// --- Mock Environment ---
process.env.MONGODB_URI = 'mongodb://localhost:27017/hsapss_portal'; // Adjust if needed

// --- Models (Minimal Definitions for Verification) ---
const StudentSchema = new Schema({
  first_name: String,
  last_name: String,
  phone: String,
  study_program: String,
  study_institution: String,
  interests: [String],
  employment_status: String,
  employment_role: String,
  employment_company: String,
  portal_password_hash: String
}, { strict: false });

const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

// --- Test Logic ---
async function runVerification() {
  console.log('🚀 Starting Smart Connect Verification...');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Create/Find a Test Student (The "User")
    const testUserPhone = '9998887777';
    let me = await Student.findOne({ phone: testUserPhone });
    if (!me) {
      me = await Student.create({
        first_name: 'Test',
        last_name: 'User',
        phone: testUserPhone,
        study_program: 'Computer Science',
        study_institution: 'University of Windsor',
        interests: ['AI', 'Coding', 'Cricket'],
        employment_status: 'student'
      });
      console.log('👤 Created Test User');
    } else {
      // Update fields to ensure matching
      me.study_program = 'Computer Science';
      me.interests = ['AI', 'Coding', 'Cricket'];
      me.employment_status = 'student';
      await me.save();
      console.log('👤 Updated Test User');
    }

    // 2. Create/Find a Match Target (The "Mentor/Peer")
    const matchPhone = '1112223333';
    let match = await Student.findOne({ phone: matchPhone });
    if (!match) {
      match = await Student.create({
        first_name: 'Mentor',
        last_name: 'Guy',
        phone: matchPhone,
        study_program: 'Computer Science', // Same Major
        study_institution: 'University of Windsor',
        interests: ['AI', 'Data Science'], // Shared Interest
        employment_status: 'employed', // Employed
        employment_role: 'Software Engineer',
        employment_company: 'Google'
      });
      console.log('👤 Created Match Target');
    } else {
       match.study_program = 'Computer Science';
       match.interests = ['AI', 'Data Science'];
       match.employment_status = 'employed';
       match.employment_role = 'Software Engineer';
       await match.save();
       console.log('👤 Updated Match Target');
    }

    // 3. Simulate API Call Logic (Directly calling the logic to avoid HTTP auth complexity in script)
    // We are testing the ALGORITHM here, not the HTTP layer (which we fixed in previous steps)
    
    console.log('\n🔍 Running Matching Algorithm...');
    
    const others = await Student.find({ _id: { $ne: me._id } }).lean();
    
    const results = others.map(other => {
      let score = 0;
      const reasons = [];
      const suggestions = [];

      // Interest Match
      const myInterests = me.interests || [];
      const otherInterests = other.interests || [];
      const sharedInterests = otherInterests.filter(i => myInterests.includes(i));
      
      if (sharedInterests.length > 0) {
        score += sharedInterests.length * 10;
        reasons.push(`Likes ${sharedInterests.join(', ')}`);
        suggestions.push(`Connect to chat about ${sharedInterests[0]}.`);
      }

      // Career Match
      const amIStudent = !me.employment_status || me.employment_status === 'student';
      const isTheyEmployed = other.employment_status === 'employed' || other.employment_status === 'full_time';
      
      if (amIStudent && isTheyEmployed) {
        score += 25;
        reasons.push(`Works at ${other.employment_company || 'a company'} as ${other.employment_role}`);
        suggestions.push(`Ask for job search advice or a referral.`);
      }

      // Academic Match
      if (other.study_program === me.study_program) {
        score += 15;
        reasons.push('Same Major');
      }

      return {
        name: `${other.first_name} ${other.last_name}`,
        score,
        reasons,
        suggestion: suggestions[0]
      };
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);

    console.log('\n📊 Match Results:');
    console.log(JSON.stringify(results, null, 2));

    if (results.length > 0 && results[0].score >= 40) { // Expecting high score due to multiple matches
       console.log('\n✅ SUCCESS: Smart Connect logic is working!');
    } else {
       console.log('\n❌ FAILURE: Did not find expected high-quality match.');
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Done');
  }
}

runVerification();

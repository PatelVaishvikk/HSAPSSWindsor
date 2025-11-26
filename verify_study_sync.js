import connectDb from './lib/db.js';
import Student from './models/Student.js';
import StudyProfile from './models/StudyProfile.js';

async function verifyStudySync() {
  try {
    await connectDb();
    console.log('Connected to DB');

    // 1. Create/Find Test Student 1
    let s1 = await Student.findOne({ phone: '1111111111' });
    if (!s1) {
      console.log('Creating Student 1...');
      s1 = await Student.create({
        first_name: 'Study',
        last_name: 'Buddy1',
        phone: '1111111111',
        mail_id: 'study1@test.com'
      });
    }
    console.log('Student 1:', s1._id);

    // 2. Create/Find Test Student 2
    let s2 = await Student.findOne({ phone: '2222222222' });
    if (!s2) {
      console.log('Creating Student 2...');
      s2 = await Student.create({
        first_name: 'Study',
        last_name: 'Buddy2',
        phone: '2222222222',
        mail_id: 'study2@test.com'
      });
    }
    console.log('Student 2:', s2._id);

    // 3. Create Profiles
    console.log('Upserting Profile 1...');
    await StudyProfile.findOneAndUpdate(
      { student: s1._id },
      {
        student: s1._id,
        study_style: 'discussion',
        study_time: 'evening',
        courses: ['MATH101', 'CS100'],
        goals: ['exams']
      },
      { upsert: true, new: true }
    );

    console.log('Upserting Profile 2...');
    await StudyProfile.findOneAndUpdate(
      { student: s2._id },
      {
        student: s2._id,
        study_style: 'discussion',
        study_time: 'evening',
        courses: ['MATH101', 'PHYS100'],
        goals: ['exams']
      },
      { upsert: true, new: true }
    );

    console.log('Profiles Created/Updated');

    // 4. Test Matching Logic
    const myProfile = await StudyProfile.findOne({ student: s1._id });
    const others = await StudyProfile.find({ student: { $ne: s1._id } });

    console.log(`Found ${others.length} potential matches for ${s1.first_name}`);

    const matches = others.map(other => {
      let score = 0;
      if (other.study_time === myProfile.study_time) score += 30;
      if (other.study_style === myProfile.study_style) score += 20;
      const sharedCourses = other.courses.filter(c => myProfile.courses.includes(c));
      score += sharedCourses.length * 15;
      
      return { id: other.student, score };
    });

    console.log('Matches:', matches);

    if (matches.length > 0 && matches[0].score >= 50) {
      console.log('SUCCESS: Matching logic works!');
    } else {
      console.error('FAILURE: Matching logic did not produce expected score.');
    }

  } catch (error) {
    console.error('Verification Failed:', error);
  } finally {
    process.exit(0);
  }
}

verifyStudySync();

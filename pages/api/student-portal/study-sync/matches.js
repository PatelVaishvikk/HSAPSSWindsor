import connectDb from '../../../../lib/db.js';
import StudyProfile from '../../../../models/StudyProfile.js';
import Student from '../../../../models/Student.js'; // Ensure Student model is registered
import { getPortalSessionFromRequest } from '../../../../lib/studentPortalAuth.js';

export default async function handler(req, res) {
  await connectDb();

  const session = await getPortalSessionFromRequest(req, res);
  const student = session?.student;
  
  if (!student) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    // 1. Fetch all other students (excluding self)
    const { scope = 'all' } = req.query;
    const query = { _id: { $ne: student._id } };

    if (scope === 'my_mandal') {
        if (student.mandal_name) {
            const isWindsor = /^windsor$/i.test(student.mandal_name);
            if (isWindsor) {
                query.$or = [
                     { mandal_name: { $regex: new RegExp(`^${student.mandal_name}$`, 'i') } },
                     { mandal_name: { $exists: false } }, 
                     { mandal_name: '' },
                     { mandal_name: null }
                ];
            } else {
                query.mandal_name = { $regex: new RegExp(`^${student.mandal_name}$`, 'i') };
            }
        } else {
             query.mandal_name = '__RESTRICTED__'; // No mandal -> no matches
        }
    } else if (scope === 'other_mandals') {
        if (student.mandal_name) {
             const isWindsor = /^windsor$/i.test(student.mandal_name);
             if (isWindsor) {
                 query.$and = [
                     { mandal_name: { $not: { $regex: new RegExp(`^${student.mandal_name}$`, 'i') } } },
                     { mandal_name: { $ne: '' } },
                     { mandal_name: { $ne: null } }
                 ];
             } else {
                 query.mandal_name = { $not: { $regex: new RegExp(`^${student.mandal_name}$`, 'i') } };
             }
        }
    }

    const others = await Student.find(query)
    .select('first_name last_name profile_picture study_program study_institution study_specialization interests employment_status employment_role employment_company bio')
    .lean();

    // 2. Scoring & Suggestion Algorithm
    const matches = others.map(other => {
      let score = 0;
      const reasons = [];
      const suggestions = []; // New: Actionable advice

      // --- Interest Match (Case-Insensitive) ---
      const myInterests = (student.interests || []).map(i => i.toLowerCase().trim());
      const otherInterests = (other.interests || []).map(i => i.toLowerCase().trim());
      const sharedInterests = otherInterests.filter(i => myInterests.includes(i));
      
      if (sharedInterests.length > 0) {
        score += sharedInterests.length * 15; // Increased weight
        reasons.push(`Likes ${sharedInterests[0]}`); // Simplify reason
        suggestions.push(`Connect to chat about ${sharedInterests[0]}.`);
      }

      // --- Career Match (Mentorship/Networking) ---
      // If I am looking for a job/student and they are employed
      const amIStudent = !student.employment_status || student.employment_status === 'student' || student.employment_status === 'looking';
      const isTheyEmployed = other.employment_status === 'employed' || other.employment_status === 'full_time';
      
      if (amIStudent && isTheyEmployed) {
        score += 30; // Increased weight
        reasons.push(`Works at ${other.employment_company || 'a company'}`);
        suggestions.push(`Ask for job search advice or a referral.`);
      } else if (other.employment_role && student.employment_role && other.employment_role === student.employment_role) {
         score += 20;
         reasons.push(`Also a ${other.employment_role}`);
         suggestions.push(`Share industry insights.`);
      }

      // --- Academic Match (Study Partners) ---
      if (other.study_program && other.study_program === student.study_program) {
        score += 20; // Increased weight
        reasons.push('Same Major');
        suggestions.push('Great study partner for exams.');
      }
      
      if (other.study_institution && other.study_institution === student.study_institution) {
        score += 10; // Increased weight
        reasons.push('Same School');
      }

      // --- Random Discovery (Reduced) ---
      // Only add random boost if there's at least SOME connection, or if score is 0 to help discovery
      if (score === 0) {
          score += Math.random() * 5; 
      } else {
          score += Math.random() * 10; // Boost existing matches slightly
      }

      // Normalize Score (Cap at 99)
      const matchPercent = Math.min(Math.round(score), 99);

      return {
        student: other, // Structure to match frontend expectation (match.student)
        matchPercent,
        reasons: reasons.slice(0, 3), // Top 3 reasons
        suggestion: suggestions[0] || 'Say hi and expand your network!' // Top suggestion
      };
    });

    // 3. Filter & Sort
    // Only show people with some relevance (score > 10)
    const relevantMatches = matches
      .filter(m => m.matchPercent > 10)
      .sort((a, b) => b.matchPercent - a.matchPercent)
      .slice(0, 20); // Top 20

    return res.status(200).json({ matches: relevantMatches });
  } catch (error) {
    console.error('Matching Error:', error);
    return res.status(500).json({ error: 'Failed to find matches' });
  }
}

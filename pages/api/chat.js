// pages/api/chat.js
import connectDb from '../../lib/db';
import Student from '../../models/Student';
import { requireAdmin } from '../../lib/adminRoute.js';

// ---------------------------------------------------------------------------
// Keyword pattern definitions – maps regex patterns to handler functions
// ---------------------------------------------------------------------------
const DB_COMMANDS = [
  {
    pattern: /student count|how many students|total students/i,
    async handle() {
      const count = await Student.countDocuments({});
      return `There are currently **${count}** students registered in the database.`;
    }
  },
  {
    pattern: /list students|show students|all students/i,
    async handle() {
      const students = await Student.find({}, { first_name: 1, last_name: 1, mail_id: 1 }).lean();
      if (!students.length) return 'No students found in the database.';
      const list = students.map(s => `• ${s.first_name} ${s.last_name} (${s.mail_id || 'No Email'})`).join('\n');
      return `**Student List (${students.length} total):**\n${list}`;
    }
  },
  {
    pattern: /mandal.*breakdown|breakdown.*mandal|students per mandal|mandal stats|mandal count/i,
    async handle() {
      const results = await Student.aggregate([
        { $group: { _id: '$mandal_name', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      if (!results.length) return 'No mandal data found.';
      const lines = results.map(r => `• ${r._id || 'Unknown'}: ${r.count} student${r.count !== 1 ? 's' : ''}`).join('\n');
      return `**Students by Mandal:**\n${lines}`;
    }
  },
  {
    pattern: /recent students|newest students|latest students|recently joined/i,
    async handle() {
      const students = await Student.find({}, { first_name: 1, last_name: 1, created_at: 1 })
        .sort({ created_at: -1 }).limit(10).lean();
      if (!students.length) return 'No students found.';
      const lines = students.map(s => {
        const date = s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Unknown date';
        return `• ${s.first_name} ${s.last_name} — joined ${date}`;
      }).join('\n');
      return `**10 Most Recently Joined Students:**\n${lines}`;
    }
  },
  {
    pattern: /moved out|students who moved|relocated students/i,
    async handle() {
      const count = await Student.countDocuments({ moved_out: true });
      const students = await Student.find({ moved_out: true }, { first_name: 1, last_name: 1 }).limit(20).lean();
      const list = students.map(s => `• ${s.first_name} ${s.last_name}`).join('\n');
      return `**Moved-Out Students (${count} total):**\n${list}${count > 20 ? `\n…and ${count - 20} more.` : ''}`;
    }
  },
  {
    pattern: /yuvak count|how many yuvak|number of yuvak/i,
    async handle() {
      const count = await Student.countDocuments({ mukt_type: 'Yuvak' });
      return `There are **${count} Yuvaks** registered.`;
    }
  },
  {
    pattern: /yuvati count|how many yuvati|number of yuvati/i,
    async handle() {
      const count = await Student.countDocuments({ mukt_type: 'Yuvati' });
      return `There are **${count} Yuvatis** registered.`;
    }
  },
  {
    pattern: /ambrish count|how many ambrish/i,
    async handle() {
      const count = await Student.countDocuments({ mukt_type: 'Ambrish' });
      return `There are **${count} Ambrish** registered.`;
    }
  },
  {
    pattern: /students? with email|students? who have email|email registered/i,
    async handle() {
      const count = await Student.countDocuments({ mail_id: { $exists: true, $ne: '' } });
      const total = await Student.countDocuments({});
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return `**${count} out of ${total} students** (${pct}%) have an email address on file.`;
    }
  },
  {
    pattern: /birthday today|who.*birthday today|today.*birthday/i,
    async handle() {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      const students = await Student.find({}, { first_name: 1, last_name: 1, date_of_birth: 1 }).lean();
      const celebrating = students.filter(s => {
        if (!s.date_of_birth) return false;
        const dob = new Date(s.date_of_birth);
        return dob.getMonth() + 1 === month && dob.getDate() === day;
      });
      if (!celebrating.length) return `No students have a birthday today (${today.toLocaleDateString()}).`;
      const names = celebrating.map(s => `🎂 ${s.first_name} ${s.last_name}`).join('\n');
      return `**Birthdays Today (${today.toLocaleDateString()}):**\n${names}`;
    }
  },
  {
    pattern: /students? with linkedin|linkedin profiles?/i,
    async handle() {
      const count = await Student.countDocuments({ linkedin_url: { $exists: true, $ne: '' } });
      return `**${count} students** have a LinkedIn profile linked.`;
    }
  },
  {
    pattern: /^\/help$|show commands|what can you do|available commands/i,
    async handle() {
      return `**Available Commands:**\n\n` +
        `• \`student count\` — Total number of students\n` +
        `• \`list students\` — Show all student names\n` +
        `• \`recent students\` — Last 10 students to join\n` +
        `• \`mandal breakdown\` — Student count per mandal\n` +
        `• \`moved out\` — Students who have relocated\n` +
        `• \`yuvak count\` — Number of Yuvaks\n` +
        `• \`yuvati count\` — Number of Yuvatis\n` +
        `• \`ambrish count\` — Number of Ambrish\n` +
        `• \`students with email\` — Email coverage stats\n` +
        `• \`birthday today\` — Who has a birthday today\n` +
        `• \`students with linkedin\` — LinkedIn profile count\n\n` +
        `Type \`/help\` anytime to see this list.`;
    }
  }
];

// ---------------------------------------------------------------------------
// API Handler
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }
  await connectDb();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, context } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required.' });
  }

  // Check if the message matches any known DB command
  for (const command of DB_COMMANDS) {
    if (command.pattern.test(message.trim())) {
      try {
        const reply = await command.handle();
        return res.status(200).json({ reply });
      } catch (error) {
        console.error('Database query error:', error);
        return res.status(500).json({ error: 'Error querying the database.' });
      }
    }
  }

  // Fallback: AI via Hugging Face (if token is configured)
  const hfToken = process.env.HUGGINGFACE_API_TOKEN;
  if (!hfToken) {
    return res.status(200).json({
      reply:
        "I can answer questions about your student database. Try asking: " +
        "\"student count\", \"mandal breakdown\", \"recent students\", or type \"/help\" " +
        "for a full list of supported commands.\n\n" +
        "(AI responses require a HUGGINGFACE_API_TOKEN to be configured.)"
    });
  }

  try {
    const hfApiUrl = 'https://api-inference.huggingface.co/models/distilgpt2';
    const hfResponse = await fetch(hfApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: context ? `${context}\nUser: ${message}\nAI:` : `User: ${message}\nAI:`
      })
    });

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      console.error('Hugging Face API error:', hfResponse.status, errText);
      return res.status(200).json({
        reply: "I'm having trouble reaching the AI service right now. Try a database command like \"student count\" or \"/help\"."
      });
    }

    const result = await hfResponse.json();
    const reply = result[0]?.generated_text || result.generated_text || "I'm sorry, I couldn't generate a response.";
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Error calling Hugging Face API:', error);
    return res.status(500).json({ error: 'Error processing your request' });
  }
}

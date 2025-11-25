import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import dbConnect from '../../../lib/dbConnect';
import Student from '../../../models/Student';
import { authenticateStudentFromRequest } from '../../../lib/studentPortalAuth';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const authResult = await authenticateStudentFromRequest(req, res);
    if (authResult.error) {
      return res.status(authResult.status || 401).json({ error: authResult.error });
    }
    const { student } = authResult;

    const uploadDir = path.join(process.cwd(), 'public', 'profile-pics');
    
    // Ensure directory exists
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      filter: function ({ mimetype }) {
        return mimetype && mimetype.includes('image');
      },
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const uploadedFile = files.profilePicture;
    if (!uploadedFile || (Array.isArray(uploadedFile) && uploadedFile.length === 0)) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
    
    // Generate unique filename
    const fileExt = path.extname(file.originalFilename || file.newFilename);
    const fileName = `${student._id}${fileExt}`;
    const finalPath = path.join(uploadDir, fileName);

    // Delete old profile picture if exists
    if (student.profile_picture) {
      const oldPath = path.join(process.cwd(), 'public', student.profile_picture);
      try {
        await fs.unlink(oldPath);
      } catch (err) {
        console.log('Could not delete old profile picture:', err);
      }
    }

    // Move file to final location
    await fs.rename(file.filepath, finalPath);

    // Update database
    const profilePicturePath = `/profile-pics/${fileName}`;
    student.profile_picture = profilePicturePath;
    await student.save();

    return res.status(200).json({
      success: true,
      profile_picture: profilePicturePath
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    return res.status(500).json({ error: 'Failed to upload profile picture' });
  }
}

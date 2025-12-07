import connectDb from '../../../../lib/db';
import Resource from '../../../../models/Resource';
import { librarySeedData } from '../../../../data/librarySeed'; // The "GitHub" Source

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDb();

    // OPTIONAL: Add Admin Check here 
    // const { adminSecret } = req.body;
    // if (adminSecret !== process.env.ADMIN_SECRET) ...

    // 1. Clear existing "Seed" items? 
    // Strategy: We can either wipe EVERYTHING or just wipe items that look like seeds.
    // For "Reset Library", wiping everything might be drastic if users added stuff.
    // Let's just Add missing ones, or Wipe All if requested.
    // User requested "Reset", implying a fresh start.
    
    // SAFE MODE: Only add items if they don't exist (by URL).
    // FULL RESET MODE: Delete All -> Add All.
    
    // We'll go with SAFE ADDITION to prevent deleting user uploads accidentally.
    
    let addedCount = 0;
    
    for (const item of librarySeedData) {
      // Check if exists
      const exists = await Resource.findOne({ url: item.url });
      if (!exists) {
        await Resource.create({
            type: item.type,
            title: item.title,
            author: item.author,
            category: item.category,
            tags: item.tags,
            url: item.url,
            thumbnail: item.thumbnail,
            cover_color: item.cover_color,
            uploaded_by: 'Admin (Official)',
            uploader_id: 'admin_seed', // Special ID for seed items
            youtubeId: item.youtubeId
        });
        addedCount++;
      }
    }

    res.status(200).json({ success: true, message: `Library Scaled!`, added: addedCount });
  } catch (error) {
    console.error('Seed Error:', error);
    res.status(500).json({ error: error.message });
  }
}

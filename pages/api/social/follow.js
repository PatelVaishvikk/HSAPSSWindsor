import connectDb from '../../../lib/db';
import Student from '../../../models/Student';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await connectDb();
    const { followerId, targetId } = req.body;

    if (!followerId || !targetId) {
      return res.status(400).json({ error: 'Missing followerId or targetId' });
    }

    if (followerId === targetId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const follower = await Student.findById(followerId);
    if (!follower) {
      return res.status(404).json({ error: 'Follower not found' });
    }

    const target = await Student.findById(targetId);
    if (!target) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const isFollowing = follower.following.includes(targetId);

    if (isFollowing) {
      // Unfollow
      follower.following = follower.following.filter(id => id.toString() !== targetId);
      target.followers = target.followers.filter(id => id.toString() !== followerId);
    } else {
      // Follow
      follower.following.push(targetId);
      target.followers.push(followerId);
    }

    await Promise.all([follower.save(), target.save()]);

    res.status(200).json({ 
      success: true, 
      isFollowing: !isFollowing,
      followersCount: target.followers.length 
    });

  } catch (error) {
    console.error('Follow API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

import connectDb from '../../../lib/db';
import Post from '../../../models/Post';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await connectDb();
    const { postId, userId, userName } = req.body; // Added userName for notification

    if (!postId || !userId) {
      return res.status(400).json({ error: 'Missing postId or userId' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      // Like
      post.likes.push(userId);

      // Emit Notification specific to student
      if (global.io && post.author_id.toString() !== userId) {
         global.io.to(`student:${post.author_id}`).emit('notification', {
            type: 'like',
            title: 'New Like',
            message: `${userName || 'Someone'} liked your post.`,
            variant: 'danger', // for local consistency
            senderId: userId
         });
      }
    }

    await post.save();

    res.status(200).json({ 
      success: true, 
      isLiked: !isLiked,
      likesCount: post.likes.length
    });

  } catch (error) {
    console.error('Like API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

import connectDb from '../../../lib/db.js';
import Post from '../../../models/Post.js';
import Comment from '../../../models/Comment.js';
import Notification from '../../../models/Notification.js';
import { authenticateStudentFromRequest } from '../../../lib/studentPortalAuth.js';

const sanitizeString = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
};

const formatStudent = (student) => {
  if (!student) {
    return null;
  }
  const doc = student.toObject ? student.toObject() : student;
  return {
    id: doc._id ? doc._id.toString() : null,
    first_name: doc.first_name || '',
    last_name: doc.last_name || '',
    study: doc.study || '',
    community_headline: doc.community_headline || '',
    last_seen: doc.last_portal_login_at
      ? new Date(doc.last_portal_login_at).toISOString()
      : null,
    online: doc.last_portal_login_at
      ? Date.now() - new Date(doc.last_portal_login_at).getTime() <= 5 * 60 * 1000
      : false
  };
};

const formatComment = (comment) => {
  const doc = comment.toObject ? comment.toObject() : comment;
  return {
    id: doc._id ? doc._id.toString() : null,
    post: doc.post ? doc.post.toString() : null,
    author: formatStudent(doc.author || null),
    content: doc.content || '',
    created_at: doc.created_at ? new Date(doc.created_at).toISOString() : null,
    updated_at: doc.updated_at ? new Date(doc.updated_at).toISOString() : null
  };
};

export default async function handler(req, res) {
  try {
    await connectDb();
    const authResult = await authenticateStudentFromRequest(req, res);
    if (authResult.error) {
      return res.status(authResult.status || 401).json({ error: authResult.error });
    }
    const { student: viewer } = authResult;

    if (req.method !== 'POST' && req.method !== 'GET' && req.method !== 'DELETE') {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const { action } = req.query;

    switch (action) {
      case 'like': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const { postId } = req.body;
        const cleanId = sanitizeString(postId);

        if (!cleanId) {
          return res.status(400).json({ error: 'Post ID is required' });
        }

        const post = await Post.findById(cleanId);

        if (!post) {
          return res.status(404).json({ error: 'Post not found' });
        }

        const wasLiked = await post.toggleLike(viewer._id);

        if (wasLiked && post.author.toString() !== viewer._id.toString()) {
          // Create Notification
          await Notification.create({
            recipient: post.author,
            sender: viewer._id,
            type: 'like',
            title: 'New Like',
            message: `${viewer.first_name} ${viewer.last_name} liked your post`,
            data: { postId: cleanId, userId: viewer._id.toString() }
          });

          // Emit notification
          const io = global?.io;
          if (io) {
            io.to(post.author.toString()).emit('notification', {
              title: 'New Like',
              message: `${viewer.first_name} ${viewer.last_name} liked your post`,
              variant: 'info',
              icon: 'heart',
              timestamp: new Date()
            });
          }
        }

        const io = global?.io;
        if (io) {
          io.to('feed').emit('post:like', { 
            postId: cleanId, 
            likes: post.likes.length,
            userId: viewer._id.toString(),
            liked: wasLiked
          });
        }

        return res.status(200).json({ 
          liked: wasLiked, 
          likes: post.likes.length 
        });
      }

      case 'comment': {
        if (req.method === 'POST') {
          const { postId, content } = req.body;
          const cleanPostId = sanitizeString(postId);
          const cleanContent = sanitizeString(content);

          if (!cleanPostId) {
            return res.status(400).json({ error: 'Post ID is required' });
          }

          if (!cleanContent) {
            return res.status(400).json({ error: 'Comment content is required' });
          }

          const post = await Post.findById(cleanPostId);

          if (!post) {
            return res.status(404).json({ error: 'Post not found' });
          }

          const comment = new Comment({
            post: cleanPostId,
            author: viewer._id,
            content: cleanContent.slice(0, 1000)
          });

          await comment.save();
          await comment.populate({
            path: 'author',
            select: 'first_name last_name study community_headline last_portal_login_at'
          });

          const payload = formatComment(comment);

          if (post.author.toString() !== viewer._id.toString()) {
            // Create Notification
            await Notification.create({
              recipient: post.author,
              sender: viewer._id,
              type: 'comment',
              title: 'New Comment',
              message: `${viewer.first_name} ${viewer.last_name} commented on your post`,
              data: { postId: cleanPostId, commentId: comment._id.toString() }
            });

            // Emit notification
            const io = global?.io;
            if (io) {
              io.to(post.author.toString()).emit('notification', {
                title: 'New Comment',
                message: `${viewer.first_name} ${viewer.last_name} commented on your post`,
                variant: 'info',
                icon: 'comment',
                timestamp: new Date()
              });
            }
          }

          const io = global?.io;
          if (io) {
            io.to('feed').emit('post:comment', { comment: payload });
          }

          return res.status(201).json({ comment: payload });
        } else if (req.method === 'GET') {
          const { postId, page = 1, limit = 50 } = req.query;
          const cleanPostId = sanitizeString(postId);

          if (!cleanPostId) {
            return res.status(400).json({ error: 'Post ID is required' });
          }

          const skip = (parseInt(page) - 1) * parseInt(limit);

          const comments = await Comment.find({ post: cleanPostId })
            .sort({ created_at: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
              path: 'author',
              select: 'first_name last_name study community_headline last_portal_login_at'
            });

          const formattedComments = comments.map(formatComment);

          return res.status(200).json({ comments: formattedComments });
        } else if (req.method === 'DELETE') {
          const { commentId } = req.query;
          const cleanId = sanitizeString(commentId);

          if (!cleanId) {
            return res.status(400).json({ error: 'Comment ID is required' });
          }

          const comment = await Comment.findById(cleanId);

          if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
          }

          const commentAuthorId = comment.author?._id?.toString() || comment.author?.toString();
          if (commentAuthorId !== viewer._id.toString()) {
            return res.status(403).json({ error: 'Only the author can delete this comment' });
          }

          await comment.deleteOne();

          const io = global?.io;
          if (io) {
            io.to('feed').emit('post:comment:delete', { 
              commentId: cleanId,
              postId: comment.post.toString()
            });
          }

          return res.status(200).json({ message: 'Comment deleted successfully' });
        }
        break;
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Post actions API error:', error);
    return res.status(500).json({ error: 'Unable to process action right now' });
  }
}

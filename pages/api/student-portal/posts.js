import dbConnect from '../../../lib/dbConnect';
import Post from '../../../models/Post.js';
import Comment from '../../../models/Comment.js';
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

const formatPost = async (post, viewerId) => {
  const doc = post.toObject ? post.toObject() : post;
  
  // Count comments for this post
  const commentCount = await Comment.countDocuments({ post: doc._id });
  
  // Check if viewer liked this post
  // doc.likes can be array of IDs OR array of populated objects
  const isLiked = doc.likes ? doc.likes.some(like => {
    const likeId = like._id || like;
    return likeId.toString() === viewerId.toString();
  }) : false;
  
  return {
    id: doc._id ? doc._id.toString() : null,
    author: formatStudent(doc.author || null),
    content: doc.content || '',
    likes: doc.likes ? doc.likes.length : 0,
    liked_by: doc.likes && doc.likes.length > 0 ? 
      doc.likes
        .filter(u => u.first_name) // Only include populated users
        .map(u => ({ 
          id: u._id.toString(), 
          name: `${u.first_name} ${u.last_name || ''}`.trim() 
        })) : [],
    shares: doc.shares ? doc.shares.length : 0,
    comments: commentCount,
    is_liked: isLiked,
    is_owner: doc.author && doc.author._id ? doc.author._id.toString() === viewerId.toString() : false,
    shared_from: doc.shared_from ? await formatSharedPost(doc.shared_from, viewerId) : null,
    created_at: doc.created_at ? new Date(doc.created_at).toISOString() : null,
    updated_at: doc.updated_at ? new Date(doc.updated_at).toISOString() : null
  };
};

const formatSharedPost = async (sharedPost, viewerId) => {
  if (!sharedPost) return null;
  const doc = sharedPost.toObject ? sharedPost.toObject() : sharedPost;
  return {
    id: doc._id ? doc._id.toString() : null,
    author: formatStudent(doc.author || null),
    content: doc.content || '',
    created_at: doc.created_at ? new Date(doc.created_at).toISOString() : null
  };
};

export default async function handler(req, res) {
  try {
    await dbConnect();
    const authResult = await authenticateStudentFromRequest(req, res);
    if (authResult.error) {
      return res.status(authResult.status || 401).json({ error: authResult.error });
    }
    const { student: viewer } = authResult;

    switch (req.method) {
      case 'GET': {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const posts = await Post.find()
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate({
            path: 'author',
            select: 'first_name last_name study community_headline last_portal_login_at'
          })
          .populate({
            path: 'likes',
            select: 'first_name last_name'
          })
          .populate({
            path: 'shared_from',
            populate: {
              path: 'author',
              select: 'first_name last_name study community_headline last_portal_login_at'
            }
          });

        const formattedPosts = await Promise.all(
          posts.map(post => formatPost(post, viewer._id))
        );

        return res.status(200).json({ posts: formattedPosts });
      }

      case 'POST': {
        const { content, shared_from } = req.body || {};
        const cleanContent = sanitizeString(content);
        const cleanSharedFrom = sanitizeString(shared_from);

        if (!cleanContent && !cleanSharedFrom) {
          return res.status(400).json({ error: 'Post content or shared post is required' });
        }

        const postData = {
          author: viewer._id,
          content: cleanContent.slice(0, 2000)
        };

        if (cleanSharedFrom) {
          let originalPost = await Post.findById(cleanSharedFrom);
          if (!originalPost) {
            return res.status(404).json({ error: 'Original post not found' });
          }

          // Prevent chain sharing: if sharing a share, share the ROOT post
          if (originalPost.shared_from) {
              const rootPost = await Post.findById(originalPost.shared_from);
              if (rootPost) {
                  originalPost = rootPost;
                  postData.shared_from = rootPost._id;
              } else {
                  // Fallback if root is gone
                  postData.shared_from = cleanSharedFrom;
              }
          } else {
              postData.shared_from = cleanSharedFrom;
          }
          
          // Add to original post's shares array safely
          if (!originalPost.shares) {
            originalPost.shares = [];
          }
          const alreadyShared = originalPost.shares.some(id => 
            id.toString() === viewer._id.toString()
          );
          
          if (!alreadyShared) {
            originalPost.shares.push(viewer._id);
            await originalPost.save();
          }
        }

        const post = new Post(postData);
        await post.save();
        
        await post.populate([
          {
            path: 'author',
            select: 'first_name last_name study community_headline last_portal_login_at'
          },
          {
            path: 'shared_from',
            populate: {
              path: 'author',
              select: 'first_name last_name study community_headline last_portal_login_at'
            }
          }
        ]);

        const payload = await formatPost(post, viewer._id);
        
        const io = global?.io;
        if (io) {
          io.to('feed').emit('post:new', { post: payload });
        }

        return res.status(201).json({ post: payload });
      }

      case 'PUT': {
        const { postId, content } = req.body || {};
        const cleanId = sanitizeString(postId);
        const cleanContent = sanitizeString(content);

        if (!cleanId) {
          return res.status(400).json({ error: 'Post ID is required' });
        }

        if (!cleanContent) {
          return res.status(400).json({ error: 'Content is required' });
        }

        const post = await Post.findById(cleanId).populate({
          path: 'author',
          select: 'first_name last_name study community_headline last_portal_login_at'
        });

        if (!post) {
          return res.status(404).json({ error: 'Post not found' });
        }

        if (post.author._id.toString() !== viewer._id.toString()) {
          return res.status(403).json({ error: 'Only the author can edit this post' });
        }

        post.content = cleanContent.slice(0, 2000);
        await post.save();

        const payload = await formatPost(post, viewer._id);
        
        const io = global?.io;
        if (io) {
          io.to('feed').emit('post:update', { post: payload });
        }

        return res.status(200).json({ post: payload });
      }

      case 'DELETE': {
        const { postId } = req.query;
        const cleanId = sanitizeString(postId);

        console.log('[API] DELETE Post Request:', { postId, cleanId, viewerId: viewer._id });

        if (!cleanId) {
          return res.status(400).json({ error: 'Post ID is required' });
        }

        const post = await Post.findById(cleanId);

        if (!post) {
          console.log('[API] Post not found for ID:', cleanId);
          return res.status(404).json({ error: 'Post not found' });
        }

        const postAuthorId = post.author?._id?.toString() || post.author?.toString();
        
        console.log('[API] Msg Auth Check:', {
          postAuthorId,
          viewerId: viewer._id.toString(),
          match: postAuthorId === viewer._id.toString()
        });

        if (postAuthorId !== viewer._id.toString()) {
          return res.status(403).json({ error: 'Only the author can delete this post' });
        }

        // Delete all comments for this post
        await Comment.deleteMany({ post: cleanId });

        await post.deleteOne();

        const io = global?.io;
        if (io) {
          io.to('feed').emit('post:delete', { postId: cleanId });
        }

        return res.status(200).json({ message: 'Post deleted successfully' });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Posts API error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: 'Unable to process posts right now', details: error.message });
  }
}

import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Edit2, Trash2, X, Check, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Dropdown } from 'react-bootstrap';

const PostCard = ({ 
  post, 
  currentUser, 
  onLike, 
  onToggleComments, 
  onShare,
  showComments, 
  comments,
  commentDraft,
  onCommentChange,
  onCommentSubmit,
  onDelete,
  onUpdate,
  onShowLikes,
  onDeleteComment,
  onUpdateComment
}) => {
  console.log('[PostCard Debug]', {
     postId: post._id || post.id,
     isOwner: post.is_owner,
     likedBy: post.liked_by,
     hasOnShowLikes: !!onShowLikes,
     currentUser: currentUser ? (currentUser._id || currentUser.id) : 'null'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  
  // Comment Editing State
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

  const postId = post._id || post.id;

  const handleLike = async () => {
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);
    setIsLikeAnimating(true);
    setTimeout(() => setIsLikeAnimating(false), 300);

    try {
      await onLike(postId);
    } catch (error) {
      setIsLiked(!newIsLiked);
      setLikesCount(prev => !newIsLiked ? prev + 1 : prev - 1);
    }
  };

  const handleUpdate = () => {
    if (editContent.trim() !== post.content) {
        onUpdate(postId, editContent);
    }
    setIsEditing(false);
  };

  return (
    <div className="glass-card p-4 mb-4">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="avatar-hover" style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             {post.author.profile_picture ? (
                 <img src={post.author.profile_picture} alt="Author" className="w-100 h-100 object-fit-cover" />
             ) : (
                <span style={{ fontSize: '1.2rem', fontWeight: '600', color: '#4f46e5' }}>
                    {post.author.first_name[0]}{post.author.last_name[0]}
                </span>
             )}
          </div>
          <div>
            <h6 className="mb-0 font-weight-bold text-dark">
              {post.author.first_name} {post.author.last_name}
            </h6>
            <small className="text-secondary">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </small>
          </div>
        </div>
        
        {post.is_owner && (
            <Dropdown align="end">
                <Dropdown.Toggle as="button" className="btn btn-link text-secondary p-1 border-0 custom-dropdown-toggle">
                    <MoreHorizontal size={20} />
                </Dropdown.Toggle>

                <Dropdown.Menu className="shadow-sm border-0">
                    <Dropdown.Item onClick={() => setIsEditing(true)} className="d-flex align-items-center gap-2">
                        <Edit2 size={16} /> Edit Post
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => onDelete(postId)} className="d-flex align-items-center gap-2 text-danger">
                        <Trash2 size={16} /> Delete Post
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        )}
      </div>

      {isEditing ? (
        <div className="mb-3">
            <textarea 
                className="form-control mb-2" 
                rows="3"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
            />
            <div className="d-flex justify-content-end gap-2">
                <button className="btn btn-sm btn-light d-flex align-items-center gap-1" onClick={() => setIsEditing(false)}>
                    <X size={16} /> Cancel
                </button>
                <button className="btn btn-sm btn-primary d-flex align-items-center gap-1" onClick={handleUpdate}>
                    <Check size={16} /> Save
                </button>
            </div>
        </div>
      ) : (
        <p className="mb-3 text-dark transition-all" style={{ fontSize: '1.05rem', lineHeight: '1.6' }}>
            {post.content}
        </p>
      )}

      <div className="d-flex align-items-center gap-4 pt-3 border-top border-light">
        <div className="position-relative like-container">
            <button 
            onClick={handleLike}
            className={`btn btn-link p-0 d-flex align-items-center gap-2 ${isLiked ? 'text-danger' : 'text-secondary'}`}
            style={{ textDecoration: 'none', transition: 'transform 0.1s' }}
            >
            <Heart 
                size={20} 
                fill={isLiked ? "currentColor" : "none"} 
                className={isLikeAnimating ? 'scale-125' : ''}
            />
            </button>
            <button 
                className="btn btn-link p-0 text-dark font-weight-medium text-decoration-none"
                onClick={() => onShowLikes && onShowLikes(post)}
                style={{ fontSize: '0.95rem' }}
            >
                {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
            </button>
        </div>
        
        <button 
          onClick={() => onToggleComments && onToggleComments(postId)}
          className="btn btn-link p-0 d-flex align-items-center gap-2 text-secondary"
          style={{ textDecoration: 'none' }}
        >
          <MessageCircle size={20} />
          <span className="font-weight-medium">
             {post.comments ? `${post.comments} ` : ''}Comment{post.comments !== 1 ? 's' : ''}
          </span>
        </button>

        <button 
            onClick={() => onShare && onShare(postId)}
            className="btn btn-link p-0 d-flex align-items-center gap-2 text-secondary ml-auto" 
            style={{ textDecoration: 'none' }}
        >
            <Share2 size={20} />
        </button>
      </div>

      {/* API-driven Comments Section */}
      {showComments && (
        <div className="mt-3 pt-3 border-top border-light">
          {comments && comments.length > 0 ? (
            <div className="mb-3">
              {comments.map((comment, idx) => (
                  <div key={idx} className="d-flex gap-2 mb-2">
                    <div className="flex-grow-1">
                      <div className="bg-light rounded-3 px-3 py-2">
                        {editingCommentId === (comment.id || comment._id) ? (
                            <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if(editingCommentContent.trim()) {
                                        onUpdateComment && onUpdateComment(comment.id || comment._id, editingCommentContent, postId);
                                        setEditingCommentId(null);
                                    }
                                }}
                            >
                                <input 
                                    className="form-control form-control-sm mb-1"
                                    value={editingCommentContent}
                                    onChange={e => setEditingCommentContent(e.target.value)}
                                    autoFocus
                                />
                                <div className="d-flex gap-2 justify-content-end">
                                    <button type="button" className="btn btn-xs btn-link text-muted text-decoration-none" onClick={() => setEditingCommentId(null)}>Cancel</button>
                                    <button type="submit" className="btn btn-xs btn-primary py-0">Save</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="d-flex justify-content-between align-items-center">
                                    <strong className="small text-dark">{comment.author_name || (comment.author ? `${comment.author.first_name} ${comment.author.last_name}` : 'User')}</strong>
                                    <div className="d-flex align-items-center gap-2">
                                        <small className="text-muted" style={{ fontSize: '0.7em' }}>
                                            {formatDistanceToNow(new Date(comment.created_at || Date.now()), { addSuffix: true })}
                                        </small>
                                        
                                        {/* Comment Actions for Owner */}
                                        {currentUser && (comment.author?.id === (currentUser._id || currentUser.id) || comment.author?._id === (currentUser._id || currentUser.id)) && (
                                            <Dropdown align="end">
                                                <Dropdown.Toggle as="div" className="text-muted" style={{ cursor: 'pointer', lineHeight: 0 }}>
                                                    <MoreHorizontal size={14} />
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu className="shadow-sm border-0" style={{ minWidth: '120px' }}>
                                                    <Dropdown.Item 
                                                        onClick={() => {
                                                            setEditingCommentId(comment.id || comment._id);
                                                            setEditingCommentContent(comment.content);
                                                        }} 
                                                        className="small"
                                                    >
                                                        Edit
                                                    </Dropdown.Item>
                                                    <Dropdown.Item 
                                                        onClick={() => onDeleteComment && onDeleteComment(comment.id || comment._id, postId)} 
                                                        className="small text-danger"
                                                    >
                                                        Delete
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        )}
                                    </div>
                                </div>
                                <p className="mb-0 small text-secondary">{comment.content}</p>
                            </>
                        )}
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          ) : (
             <p className="text-muted small text-center mb-3">No comments yet.</p>
          )}

          <div className="d-flex gap-2">
            <input
              type="text"
              className="form-control form-control-sm rounded-pill"
              placeholder="Write a comment..."
              value={commentDraft || ''}
              onChange={(e) => onCommentChange && onCommentChange(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onCommentSubmit && onCommentSubmit(postId);
                  }
              }}
            />
            <button 
                className="btn btn-primary btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center"
                onClick={() => onCommentSubmit && onCommentSubmit(postId)}
                disabled={!commentDraft || !commentDraft.trim()}
                title={(!commentDraft || !commentDraft.trim()) ? "Write a comment to post" : "Post comment"}
            >
                <div style={{ transform: 'rotate(0deg)' }}>
                  <Send size={16} />
                </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;

import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  onCommentSubmit
}) => {
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

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
        <button className="btn btn-link text-secondary p-1">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <p className="mb-3 text-dark transition-all" style={{ fontSize: '1.05rem', lineHeight: '1.6' }}>
        {post.content}
      </p>

      <div className="d-flex align-items-center gap-4 pt-3 border-top border-light">
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
          <span className="font-weight-medium">{likesCount}</span>
        </button>
        
        <button 
          onClick={() => onToggleComments && onToggleComments(postId)}
          className="btn btn-link p-0 d-flex align-items-center gap-2 text-secondary"
          style={{ textDecoration: 'none' }}
        >
          <MessageCircle size={20} />
          <span className="font-weight-medium">Comment</span>
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
                  <div className="bg-light rounded-3 px-3 py-2 flex-grow-1">
                    <div className="d-flex justify-content-between">
                        <strong className="small text-dark">{comment.author_name}</strong>
                        <small className="text-muted" style={{ fontSize: '0.7em' }}>
                            {formatDistanceToNow(new Date(comment.created_at || Date.now()), { addSuffix: true })}
                        </small>
                    </div>
                    <p className="mb-0 small text-secondary">{comment.content}</p>
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
                className="btn btn-primary btn-sm rounded-circle p-2"
                onClick={() => onCommentSubmit && onCommentSubmit(postId)}
                disabled={!commentDraft?.trim()}
            >
                <div style={{ transform: 'rotate(-45deg)', paddingBottom: '2px', paddingRight: '2px' }}>➤</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;

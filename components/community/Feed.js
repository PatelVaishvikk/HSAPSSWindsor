import React from 'react';
import PostCard from './PostCard';
import UserCard from './UserCard';

const Feed = ({ 
  posts = [], 
  users = [], 
  currentUser, 
  onLikePost, 
  onFollowUser,
  onMessageUser,
  onCreatePost,
  postContent = '',
  onPostContentChange,
  isSubmitting = false,
  onToggleComments,
  onSharePost,
  showComments = {},
  postComments = {},
  commentDrafts = {},
  onCommentChange,
  onCommentSubmit
}) => {
  
  // Helper to check if current user follows target
  const isFollowing = (targetId) => {
    return currentUser.following && currentUser.following.includes(targetId);
  };

  const canMessage = (targetUser) => {
    return isFollowing(targetUser._id);
  };

  return (
    <div className="row g-4">
      {/* Main Feed Column */}
      <div className="col-lg-8">
        {/* Create Post Input */}
        {onCreatePost && (
          <div className="glass-panel p-4 mb-4 rounded-3">
            <div className="d-flex gap-3">
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                 {currentUser.profile_picture ? (
                     <img src={currentUser.profile_picture} alt="Profile" className="w-100 h-100 object-fit-cover" />
                 ) : (
                     <div className="w-100 h-100 bg-primary text-white d-flex align-items-center justify-content-center fw-bold">
                         {currentUser.first_name?.[0]}
                     </div>
                 )}
              </div>
              <div className="flex-grow-1">
                  <form onSubmit={onCreatePost}>
                      <input 
                      type="text" 
                      className="form-control border-0 bg-light mb-2" 
                      placeholder={`What's on your mind, ${currentUser.first_name}?`}
                      style={{ borderRadius: '20px' }}
                      value={postContent}
                      onChange={(e) => onPostContentChange && onPostContentChange(e.target.value)}
                      disabled={isSubmitting}
                      />
                      {postContent.trim() && (
                          <div className="d-flex justify-content-end">
                              <button 
                                  type="submit" 
                                  className="btn btn-primary rounded-pill px-4"
                                  disabled={isSubmitting || !postContent.trim()}
                              >
                                  {isSubmitting ? 'Posting...' : 'Post'}
                              </button>
                          </div>
                      )}
                  </form>
              </div>
            </div>
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-5 text-muted glass-panel rounded-3">
            <p className="mb-0">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          posts.map(post => {
            const pid = post._id || post.id;
            return (
              <PostCard 
                key={pid} 
                post={post} 
                currentUser={currentUser} 
                onLike={onLikePost}
                onToggleComments={onToggleComments}
                onShare={onSharePost}
                showComments={showComments[pid]}
                comments={postComments[pid]}
                commentDraft={commentDrafts[pid]}
                onCommentChange={(val) => onCommentChange && onCommentChange(pid, val)}
                onCommentSubmit={onCommentSubmit}
              />
            );
          })
        )}
      </div>

      {/* Sidebar Column (Suggested Users) */}
      <div className="col-lg-4 d-none d-lg-block">
        <div className="glass-panel p-3 rounded-3 sticky-top" style={{ top: '20px' }}>
            <h6 className="mb-3 px-2 font-weight-bold text-secondary text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                Suggested Students
            </h6>
            {users
              .filter(u => u._id !== currentUser._id)
              .slice(0, 5)
              .map(user => (
                <UserCard
                    key={user._id}
                    user={user}
                    currentUser={currentUser}
                    isFollowing={isFollowing(user._id)}
                    onFollow={onFollowUser}
                    onMessage={onMessageUser}
                    canMessage={canMessage(user)}
                />
            ))}
        </div>
      </div>
    </div>
  );
};

export default Feed;

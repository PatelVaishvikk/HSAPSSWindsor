import React, { useState } from 'react';
import { UserPlus, UserCheck, MessageSquare } from 'lucide-react';

const UserCard = ({ user, currentUser, isFollowing: initialIsFollowing, onFollow, onMessage, canMessage }) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const handleFollow = async () => {
    setIsLoading(true);
    // Determine action based on CURRENT state (before toggle)
    const action = isFollowing ? 'unfollow' : 'follow';
    
    // Optimistic update
    const newStatus = !isFollowing;
    setIsFollowing(newStatus);
    
    try {
      await onFollow(user._id || user.id, action);
    } catch (error) {
      // Revert on error
      setIsFollowing(!newStatus);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card p-3 mb-3 d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-center gap-3">
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontWeight: '600' }}>
            {user.first_name[0]}{user.last_name[0]}
        </div>
        <div>
          <h6 className="mb-0 text-dark" style={{ fontSize: '0.95rem' }}>
            {user.first_name} {user.last_name}
          </h6>
          <small className="text-secondary" style={{ fontSize: '0.8rem' }}>
            {user.study_program || 'Student'}
          </small>
        </div>
      </div>

      <div className="d-flex gap-2">
        <button 
          onClick={handleFollow}
          disabled={isLoading}
          className={`btn btn-sm ${isFollowing ? 'btn-light text-secondary' : 'btn-primary'} d-flex align-items-center justify-content-center`}
          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
          title={isFollowing ? "Unfollow" : "Follow"}
        >
          {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
        </button>
        
        {/* Only show message button if allowed */}
        <button 
          onClick={() => onMessage && onMessage(user)}
          disabled={!canMessage}
          className={`btn btn-sm btn-light d-flex align-items-center justify-content-center ${!canMessage ? 'opacity-50' : ''}`}
          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
          title={canMessage ? "Message" : "Follow to message"}
        >
          <MessageSquare size={16} />
        </button>
      </div>
    </div>
  );
};

export default UserCard;

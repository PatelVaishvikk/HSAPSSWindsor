import React from 'react';
import { Badge, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { UserPlus, UserCheck, MessageCircle, Clock, Check } from 'lucide-react';

const CommunityProfileCard = ({ 
  profile, 
  currentUser, 
  onFollow, 
  onMessage, 
  onRequestSupport 
}) => {
  const isFollowing = currentUser.following?.includes(profile.id);
  const isSelf = profile.is_self;
  const hasRequested = profile.has_requested_follow;

  const renderAvatar = (user) => {
    if (user.profile_picture) {
      return <img src={user.profile_picture} alt={user.first_name} className="img-fluid rounded-circle" />;
    }
    return (
      <div 
        className="d-flex align-items-center justify-content-center text-white fw-bold"
        style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', fontSize: '1.5rem' }}
      >
        {user.first_name?.[0]}{user.last_name?.[0]}
      </div>
    );
  };

  return (
    <div className="glass-card h-100 p-4 d-flex flex-column text-center position-relative overflow-hidden group">
      {/* Decorative background element */}
      <div 
        className="position-absolute w-100" 
        style={{ 
          height: '80px', 
          background: 'linear-gradient(to bottom, rgba(79, 70, 229, 0.1), transparent)', 
          top: 0, 
          left: 0 
        }} 
      />

      <div className="position-relative mx-auto mb-3" style={{ width: '96px', height: '96px' }}>
        <div className="rounded-circle overflow-hidden shadow-sm border border-4 border-white" style={{ width: '100%', height: '100%' }}>
          {renderAvatar(profile)}
        </div>
        {profile.online && (
          <span 
            className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle"
            style={{ width: '20px', height: '20px', right: '4px', bottom: '4px' }}
            title="Online now"
          ></span>
        )}
      </div>

      <h5 className="fw-bold mb-1 text-dark">
        {profile.first_name} {profile.last_name}
      </h5>
      
      <p className="text-muted small mb-3 text-truncate" style={{ minHeight: '20px' }}>
        {profile.community_headline || profile.study_program || profile.mukt_type || 'HSAPSS Member'}
      </p>

      {/* Skills / Tags */}
      <div className="d-flex justify-content-center flex-wrap gap-2 mb-4" style={{ minHeight: '30px' }}>
        {profile.available_to_help && (
            <Badge bg="success" className="fw-normal px-2 py-1 rounded-pill bg-opacity-75">
                Available to Help
            </Badge>
        )}
        {(profile.community_skills || []).slice(0, 2).map((skill, i) => (
             <Badge key={i} bg="light" text="dark" className="fw-normal border px-2 py-1 rounded-pill">
                {skill}
             </Badge>
        ))}
        {(profile.community_skills?.length > 2) && (
             <Badge bg="light" text="muted" className="fw-normal border px-2 py-1 rounded-pill">
                +{profile.community_skills.length - 2}
             </Badge>
        )}
      </div>

      <div className="mt-auto d-flex gap-2 justify-content-center">
        {!isSelf && (
          <>
            <Button
              variant={isFollowing ? "outline-secondary" : hasRequested ? "secondary" : "primary"}
              className={`flex-grow-1 d-flex align-items-center justify-content-center gap-2 ${isFollowing ? 'border-0 bg-light' : ''}`}
              size="sm"
              disabled={hasRequested}
              onClick={() => onFollow(profile.id, isFollowing ? 'unfollow' : 'request')}
              style={{ borderRadius: '10px' }}
            >
              {isFollowing ? <UserCheck size={16} /> : hasRequested ? <Clock size={16} /> : <UserPlus size={16} />}
              {isFollowing ? 'Following' : hasRequested ? 'Requested' : 'Follow'}
            </Button>

            <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Message</Tooltip>}
            >
                <Button
                    variant="light"
                    className="text-primary bg-primary-subtle border-0"
                    size="sm"
                    onClick={() => onMessage(profile)}
                    style={{ borderRadius: '10px', width: '40px' }}
                >
                    <MessageCircle size={18} />
                </Button>
            </OverlayTrigger>
          </>
        )}
        
        {isSelf && (
             <Badge bg="secondary" className="w-100 py-2 fw-normal opacity-50">
                You
             </Badge>
        )}
      </div>
    </div>
  );
};

export default CommunityProfileCard;

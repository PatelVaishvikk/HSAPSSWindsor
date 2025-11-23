import { useState, useEffect } from 'react';
import { Card, Button, Badge, Spinner, OverlayTrigger, Tooltip, ProgressBar } from 'react-bootstrap';
import { Sparkles, Users, TrendingUp, MessageCircle, Zap, Target } from 'lucide-react';

/**
 * AI-Powered Smart Networking Panel
 * Shows intelligent connection recommendations with AI-generated conversation starters
 */
export default function AINetworkingPanel({ currentUser, onConnect, onMessage }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversationStarter, setConversationStarter] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchRecommendations();
    }
  }, [currentUser]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/networking', {
        headers: {
          'X-Student-Id': currentUser._id,
          'X-Portal-Secret': currentUser.sessionPassword
        }
      });
      const data = await response.json();
      if (response.ok) {
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async (user) => {
    setSelectedUser(user);
    
    // Fetch AI-generated conversation starter
    try {
      const response = await fetch('/api/ai/conversation-starter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Id': currentUser._id,
          'X-Portal-Secret': currentUser.sessionPassword
        },
        body: JSON.stringify({ targetUserId: user.id })
      });
      const data = await response.json();
      if (response.ok) {
        setConversationStarter(data.starter || '');
      }
    } catch (error) {
      console.error('Failed to generate conversation starter:', error);
    }
  };

  const getRecommendationColor = (level) => {
    switch (level) {
      case 'high': return 'success';
      case 'medium': return 'primary';
      default: return 'secondary';
    }
  };

  const getMatchIcon = (factor) => {
    switch (factor.type) {
      case 'skills': return '🎯';
      case 'interests': return '💡';
      case 'institution': return '🏫';
      case 'complementary': return '🤝';
      default: return '✨';
    }
  };

  if (loading) {
    return (
      <Card className="ai-networking-panel">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">AI is analyzing your network...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="ai-networking-panel">
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-gradient-primary text-white border-0">
          <div className="d-flex align-items-center">
            <Sparkles className="me-2" size={20} />
            <h5 className="mb-0">AI-Powered Smart Networking</h5>
          </div>
          <small className="d-block mt-1 opacity-90">
            Intelligent connection recommendations based on your profile
          </small>
        </Card.Header>
        <Card.Body>
          {recommendations.length === 0 ? (
            <div className="text-center py-4">
              <Users size={48} className="text-muted mb-3" />
              <p className="text-muted">No recommendations yet. Complete your profile to get started!</p>
            </div>
          ) : (
            <div className="recommendations-list">
              {recommendations.map((rec, index) => (
                <Card key={index} className="recommendation-card mb-3 border hover-shadow">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="d-flex align-items-center flex-grow-1">
                        <div className="avatar-circle me-3">
                          {rec.user.initials || rec.user.first_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1">
                            {rec.user.first_name} {rec.user.last_name}
                          </h6>
                          <p className="text-muted small mb-1">
                            {rec.user.community_headline || rec.user.study || 'Student'}
                          </p>
                          {rec.user.study_institution && (
                            <small className="text-muted">
                              📚 {rec.user.study_institution}
                            </small>
                          )}
                        </div>
                      </div>
                      <Badge bg={getRecommendationColor(rec.recommendation)} className="ms-2">
                        {rec.score}% Match
                      </Badge>
                    </div>

                    {/* Match Factors */}
                    <div className="match-factors mb-3">
                      <small className="text-muted d-block mb-2">Why you should connect:</small>
                      <div className="d-flex flex-wrap gap-2">
                        {rec.factors.map((factor, idx) => (
                          <OverlayTrigger
                            key={idx}
                            placement="top"
                            overlay={
                              <Tooltip>
                                {factor.type === 'skills' && `${factor.count} shared skills`}
                                {factor.type === 'interests' && `${factor.count} shared interests`}
                                {factor.type === 'institution' && 'Same institution'}
                                {factor.type === 'complementary' && 'Complementary expertise'}
                              </Tooltip>
                            }
                          >
                            <Badge bg="light" text="dark" className="factor-badge">
                              {getMatchIcon(factor)} +{factor.score}
                            </Badge>
                          </OverlayTrigger>
                        ))}
                      </div>
                    </div>

                    {/* Skills Preview */}
                    {rec.user.community_skills && rec.user.community_skills.length > 0 && (
                      <div className="skills-preview mb-3">
                        <small className="text-muted">Skills:</small>
                        <div className="d-flex flex-wrap gap-1 mt-1">
                          {rec.user.community_skills.slice(0, 4).map((skill, idx) => (
                            <Badge key={idx} bg="info" className="skill-tag">
                              {skill}
                            </Badge>
                          ))}
                          {rec.user.community_skills.length > 4 && (
                            <Badge bg="light" text="dark">
                              +{rec.user.community_skills.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="d-flex gap-2">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => handleViewProfile(rec.user)}
                        className="flex-grow-1"
                      >
                        <Target size={14} className="me-1" />
                        View Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onMessage(rec.user, conversationStarter)}
                        className="flex-grow-1"
                      >
                        <MessageCircle size={14} className="me-1" />
                        Connect
                      </Button>
                    </div>

                    {/* AI Conversation Starter */}
                    {selectedUser?.id === rec.user.id && conversationStarter && (
                      <div className="conversation-starter mt-3 p-3 bg-light rounded">
                        <div className="d-flex align-items-start">
                          <Zap size={16} className="text-warning me-2 mt-1 flex-shrink-0" />
                          <div>
                            <small className="text-muted d-block mb-1">
                              <strong>AI Suggested Message:</strong>
                            </small>
                            <small className="text-dark">{conversationStarter}</small>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}

          {/* Network Insights */}
          <Card className="bg-light border-0 mt-4">
            <Card.Body className="p-3">
              <div className="d-flex align-items-center mb-2">
                <TrendingUp size={18} className="text-success me-2" />
                <strong className="small">Network Growth Tip</strong>
              </div>
              <small className="text-muted">
                Connect with at least 3 people this week to expand your professional network and unlock new opportunities!
              </small>
            </Card.Body>
          </Card>
        </Card.Body>
      </Card>

      <style jsx>{`
        .ai-networking-panel .avatar-circle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
        }

        .recommendation-card {
          transition: all 0.3s ease;
        }

        .recommendation-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .hover-shadow:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .bg-gradient-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .factor-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
        }

        .skill-tag {
          font-size: 0.7rem;
          font-weight: normal;
        }

        .conversation-starter {
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

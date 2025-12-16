import { useState } from 'react';
import { Card, Button, Badge, ProgressBar, Modal, Form, Alert } from 'react-bootstrap';
import { Award, CheckCircle, Star, Trophy, Target, Zap, Code, MessageSquare } from 'lucide-react';

/**
 * Skill Verification Widget
 * Verify skills through challenges, get endorsements, and build credibility
 */
export default function SkillVerificationWidget({ currentUser, skills = [] }) {
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showEndorseModal, setShowEndorseModal] = useState(false);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [endorsementMessage, setEndorsementMessage] = useState('');

  const getSkillLevelColor = (level) => {
    const colors = {
      beginner: 'secondary',
      intermediate: 'primary',
      advanced: 'warning',
      expert: 'success'
    };
    return colors[level] || 'secondary';
  };

  const getSkillLevelProgress = (level) => {
    const progress = {
      beginner: 25,
      intermediate: 50,
      advanced: 75,
      expert: 100
    };
    return progress[level] || 0;
  };

  const handleStartChallenge = (skill) => {
    setSelectedSkill(skill);
    setShowChallengeModal(true);
  };

  const handleSubmitChallenge = async () => {
    if (!selectedSkill || !challengeAnswer.trim()) return;

    try {
      const response = await fetch('/api/skills/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Id': currentUser._id,
          'X-Portal-Secret': currentUser.sessionPassword
        },
        body: JSON.stringify({
          skillId: selectedSkill.id,
          answer: challengeAnswer
        })
      });

      if (response.ok) {
        alert('Challenge submitted! Your skill will be verified shortly.');
        setShowChallengeModal(false);
        setChallengeAnswer('');
      }
    } catch (error) {
      console.error('Failed to submit challenge:', error);
    }
  };

  const handleEndorseSkill = async () => {
    if (!selectedSkill || !endorsementMessage.trim()) return;

    try {
      const response = await fetch('/api/skills/endorse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Id': currentUser._id,
          'X-Portal-Secret': currentUser.sessionPassword
        },
        body: JSON.stringify({
          skillId: selectedSkill.id,
          message: endorsementMessage
        })
      });

      if (response.ok) {
        alert('Endorsement sent successfully!');
        setShowEndorseModal(false);
        setEndorsementMessage('');
      }
    } catch (error) {
      console.error('Failed to endorse skill:', error);
    }
  };

  return (
    <div className="skill-verification-widget">
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-gradient-skills text-white border-0">
          <div className="d-flex align-items-center">
            <Trophy className="me-2" size={20} />
            <h5 className="mb-0">Skills & Verification</h5>
          </div>
          <small className="d-block mt-1 opacity-90">
            Verify your skills and earn credibility
          </small>
        </Card.Header>
        <Card.Body>
          {skills.length === 0 ? (
            <div className="text-center py-4">
              <Target size={48} className="text-muted mb-3" />
              <p className="text-muted">No skills added yet</p>
              <Button variant="primary" size="sm">
                Add Your First Skill
              </Button>
            </div>
          ) : (
            <div className="skills-list">
              {skills.map((skill, index) => (
                <Card key={index} className="skill-card mb-3 border">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center mb-2">
                          <h6 className="mb-0 me-2">{skill.name}</h6>
                          {skill.verified && (
                            <Badge bg="success" className="verified-badge">
                              <CheckCircle size={12} className="me-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <Badge bg={getSkillLevelColor(skill.level)}>
                            {skill.level}
                          </Badge>
                          {skill.category && (
                            <Badge bg="light" text="dark">
                              {skill.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="endorsement-count mb-1">
                          <Star size={16} className="text-warning me-1" />
                          <strong>{skill.endorsement_count || 0}</strong>
                        </div>
                        <small className="text-muted">endorsements</small>
                      </div>
                    </div>

                    {/* Skill Progress */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">Proficiency</small>
                        <small className="text-muted">{getSkillLevelProgress(skill.level)}%</small>
                      </div>
                      <ProgressBar 
                        now={getSkillLevelProgress(skill.level)} 
                        variant={getSkillLevelColor(skill.level)}
                        style={{ height: '6px' }}
                      />
                    </div>

                    {/* Verification Status */}
                    {!skill.verified && (
                      <Alert variant="info" className="mb-3 py-2">
                        <small>
                          <Zap size={14} className="me-1" />
                          Complete a skill challenge to get verified and boost your credibility!
                        </small>
                      </Alert>
                    )}

                    {skill.verified && skill.verification_date && (
                      <div className="mb-3">
                        <small className="text-success">
                          <CheckCircle size={14} className="me-1" />
                          Verified on {new Date(skill.verification_date).toLocaleDateString()}
                          {skill.verification_method && ` via ${skill.verification_method}`}
                        </small>
                      </div>
                    )}

                    {/* Top Endorsements */}
                    {skill.endorsements && skill.endorsements.length > 0 && (
                      <div className="mb-3">
                        <small className="text-muted d-block mb-2">Top Endorsements:</small>
                        {skill.endorsements.slice(0, 2).map((endorsement, idx) => (
                          <Card key={idx} className="bg-light border-0 mb-2">
                            <Card.Body className="p-2">
                              <div className="d-flex align-items-start">
                                <MessageSquare size={14} className="text-primary me-2 mt-1 flex-shrink-0" />
                                <div className="flex-grow-1">
                                  <small className="d-block">
                                    <strong>{endorsement.endorser_name}</strong>
                                    {endorsement.endorser_level && (
                                      <Badge bg="primary" className="ms-1" style={{ fontSize: '0.6rem' }}>
                                        {endorsement.endorser_level}
                                      </Badge>
                                    )}
                                  </small>
                                  <small className="text-muted">{endorsement.message}</small>
                                </div>
                              </div>
                            </Card.Body>
                          </Card>
                        ))}
                        {skill.endorsements.length > 2 && (
                          <small className="text-muted">
                            +{skill.endorsements.length - 2} more endorsements
                          </small>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="d-flex gap-2">
                      {!skill.verified && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStartChallenge(skill)}
                          className="flex-grow-1"
                        >
                          <Award size={14} className="me-1" />
                          Take Challenge
                        </Button>
                      )}
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => {
                          setSelectedSkill(skill);
                          setShowEndorseModal(true);
                        }}
                        className="flex-grow-1"
                      >
                        <Star size={14} className="me-1" />
                        Request Endorsement
                      </Button>
                    </div>

                    {/* Skill Offering/Seeking */}
                    <div className="d-flex gap-2 mt-2">
                      {skill.offering_help && (
                        <Badge bg="success" className="flex-grow-1 text-center py-1">
                          🤝 Offering Help
                        </Badge>
                      )}
                      {skill.seeking_help && (
                        <Badge bg="info" className="flex-grow-1 text-center py-1">
                          🎯 Seeking Help
                        </Badge>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}

          {/* Skill Stats */}
          {skills.length > 0 && (
            <Card className="bg-light border-0 mt-3">
              <Card.Body className="p-3">
                <div className="row text-center">
                  <div className="col-4">
                    <div className="h4 mb-0 text-primary">{skills.length}</div>
                    <small className="text-muted">Total Skills</small>
                  </div>
                  <div className="col-4">
                    <div className="h4 mb-0 text-success">
                      {skills.filter(s => s.verified).length}
                    </div>
                    <small className="text-muted">Verified</small>
                  </div>
                  <div className="col-4">
                    <div className="h4 mb-0 text-warning">
                      {skills.reduce((sum, s) => sum + (s.endorsement_count || 0), 0)}
                    </div>
                    <small className="text-muted">Endorsements</small>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}
        </Card.Body>
      </Card>

      {/* Challenge Modal */}
      <Modal show={showChallengeModal} onHide={() => setShowChallengeModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <Award className="me-2" size={24} />
            Skill Verification Challenge: {selectedSkill?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <strong>Complete this challenge to verify your skill!</strong>
            <p className="mb-0 mt-2 small">
              Your response will be reviewed, and upon approval, your skill will be marked as verified,
              increasing your credibility in the community.
            </p>
          </Alert>

          <Card className="bg-light border-0 mb-3">
            <Card.Body>
              <h6 className="mb-3">Challenge Question:</h6>
              {selectedSkill?.name === 'JavaScript' && (
                <p>
                  Explain the difference between <code>let</code>, <code>const</code>, and <code>var</code> in JavaScript.
                  Provide examples of when you would use each.
                </p>
              )}
              {selectedSkill?.name === 'Python' && (
                <p>
                  Explain what list comprehensions are in Python and provide an example of how they can
                  make code more concise.
                </p>
              )}
              {selectedSkill?.name !== 'JavaScript' && selectedSkill?.name !== 'Python' && (
                <p>
                  Describe a project or scenario where you&apos;ve applied <strong>{selectedSkill?.name}</strong>.
                  What challenges did you face and how did you overcome them?
                </p>
              )}
            </Card.Body>
          </Card>

          <Form.Group>
            <Form.Label>Your Answer *</Form.Label>
            <Form.Control
              as="textarea"
              rows={8}
              placeholder="Type your detailed answer here..."
              value={challengeAnswer}
              onChange={(e) => setChallengeAnswer(e.target.value)}
            />
            <Form.Text className="text-muted">
              Minimum 100 characters. Be thorough and demonstrate your knowledge.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowChallengeModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmitChallenge}
            disabled={challengeAnswer.length < 100}
          >
            <Award size={16} className="me-1" />
            Submit Challenge
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Endorsement Modal */}
      <Modal show={showEndorseModal} onHide={() => setShowEndorseModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Request Skill Endorsement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Request an endorsement for <strong>{selectedSkill?.name}</strong> from someone who has
            seen your work or collaborated with you.
          </p>
          <Form.Group>
            <Form.Label>Message (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Add a personal message to your endorsement request..."
              value={endorsementMessage}
              onChange={(e) => setEndorsementMessage(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEndorseModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleEndorseSkill}>
            <Star size={16} className="me-1" />
            Send Request
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .bg-gradient-skills {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .skill-card {
          transition: all 0.2s ease;
        }

        .skill-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .verified-badge {
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
        }

        .endorsement-count {
          display: flex;
          align-items: center;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}

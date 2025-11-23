import { useState, useEffect } from 'react';
import { Card, Button, Badge, Form, InputGroup, Row, Col, Modal, Alert } from 'react-bootstrap';
import { 
  Briefcase, MapPin, DollarSign, Clock, Users, Star,
  Search, Filter, Bookmark, Send, TrendingUp, Award,
  Code, Palette, BarChart, Rocket, Heart
} from 'lucide-react';

/**
 * Opportunity Marketplace Feed
 * Jobs, internships, freelance projects, collaborations, and mentorship opportunities
 */
export default function OpportunityFeed({ currentUser }) {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [savedOpportunities, setSavedOpportunities] = useState(new Set());

  useEffect(() => {
    fetchOpportunities();
  }, [filter]);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('type', filter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/opportunities?${params.toString()}`, {
        headers: {
          'X-Student-Id': currentUser._id,
          'X-Portal-Secret': currentUser.sessionPassword
        }
      });
      const data = await response.json();
      if (response.ok) {
        setOpportunities(data.opportunities || []);
      }
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOpportunity = async (oppId) => {
    try {
      const response = await fetch(`/api/opportunities/${oppId}/save`, {
        method: 'POST',
        headers: {
          'X-Student-Id': currentUser._id,
          'X-Portal-Secret': currentUser.sessionPassword
        }
      });
      if (response.ok) {
        setSavedOpportunities(prev => new Set([...prev, oppId]));
      }
    } catch (error) {
      console.error('Failed to save opportunity:', error);
    }
  };

  const handleApply = async () => {
    if (!selectedOpp) return;

    try {
      const response = await fetch(`/api/opportunities/${selectedOpp.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Id': currentUser._id,
          'X-Portal-Secret': currentUser.sessionPassword
        },
        body: JSON.stringify({
          message: applicationMessage,
          portfolio_url: currentUser.portfolio_url,
          linkedin_url: currentUser.linkedin_url
        })
      });

      if (response.ok) {
        setShowApplyModal(false);
        setApplicationMessage('');
        alert('Application submitted successfully!');
      }
    } catch (error) {
      console.error('Failed to apply:', error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'job': return <Briefcase size={18} />;
      case 'internship': return <Award size={18} />;
      case 'freelance': return <Code size={18} />;
      case 'collaboration': return <Users size={18} />;
      case 'co_founder': return <Rocket size={18} />;
      case 'mentorship': return <Star size={18} />;
      default: return <Briefcase size={18} />;
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      job: 'primary',
      internship: 'success',
      freelance: 'info',
      collaboration: 'warning',
      co_founder: 'danger',
      mentorship: 'purple'
    };
    return colors[type] || 'secondary';
  };

  const filteredOpportunities = opportunities.filter(opp => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return opp.title.toLowerCase().includes(query) ||
             opp.description.toLowerCase().includes(query) ||
             opp.required_skills.some(skill => skill.toLowerCase().includes(query));
    }
    return true;
  });

  return (
    <div className="opportunity-feed">
      {/* Header */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-1">
                <TrendingUp className="me-2" size={24} />
                Opportunity Marketplace
              </h4>
              <p className="text-muted small mb-0">
                Discover jobs, projects, and collaboration opportunities
              </p>
            </div>
            <Button variant="primary" size="sm">
              <Send size={16} className="me-1" />
              Post Opportunity
            </Button>
          </div>

          {/* Search and Filter */}
          <Row className="g-2">
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text>
                  <Search size={18} />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search by title, skills, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="job">Full-time Jobs</option>
                <option value="internship">Internships</option>
                <option value="freelance">Freelance</option>
                <option value="collaboration">Collaborations</option>
                <option value="co_founder">Co-founder</option>
                <option value="mentorship">Mentorship</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Opportunities List */}
      <div className="opportunities-list">
        {filteredOpportunities.map((opp) => (
          <Card key={opp.id} className="opportunity-card mb-3 border-0 shadow-sm hover-lift">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center mb-2">
                    <Badge bg={getTypeColor(opp.type)} className="me-2">
                      {getTypeIcon(opp.type)}
                      <span className="ms-1">{opp.type.replace('_', ' ')}</span>
                    </Badge>
                    {opp.featured && (
                      <Badge bg="warning" text="dark">
                        <Star size={12} className="me-1" />
                        Featured
                      </Badge>
                    )}
                    {opp.verified && (
                      <Badge bg="success" className="ms-1">
                        ✓ Verified
                      </Badge>
                    )}
                  </div>
                  <h5 className="mb-2">{opp.title}</h5>
                  {opp.company && (
                    <p className="text-muted small mb-2">
                      <strong>{opp.company.name}</strong>
                      {opp.company.website && (
                        <a href={opp.company.website} target="_blank" rel="noopener noreferrer" className="ms-2">
                          🔗
                        </a>
                      )}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => handleSaveOpportunity(opp.id)}
                  className={savedOpportunities.has(opp.id) ? 'active' : ''}
                >
                  <Bookmark size={16} fill={savedOpportunities.has(opp.id) ? 'currentColor' : 'none'} />
                </Button>
              </div>

              <p className="text-muted mb-3">{opp.description.substring(0, 200)}...</p>

              {/* Meta Information */}
              <div className="d-flex flex-wrap gap-3 mb-3 text-muted small">
                {opp.location && (
                  <span>
                    <MapPin size={14} className="me-1" />
                    {opp.location}
                  </span>
                )}
                {opp.remote && (
                  <Badge bg="info" className="text-white">
                    🌐 Remote
                  </Badge>
                )}
                {opp.compensation && (
                  <span>
                    <DollarSign size={14} className="me-1" />
                    {opp.compensation.type === 'salary' && `$${opp.compensation.min?.toLocaleString()} - $${opp.compensation.max?.toLocaleString()}`}
                    {opp.compensation.type === 'equity' && `${opp.compensation.equity_percentage}% equity`}
                    {opp.compensation.type === 'negotiable' && 'Negotiable'}
                  </span>
                )}
                {opp.commitment && (
                  <span>
                    <Clock size={14} className="me-1" />
                    {opp.commitment.replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* Required Skills */}
              {opp.required_skills && opp.required_skills.length > 0 && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-2">Required Skills:</small>
                  <div className="d-flex flex-wrap gap-1">
                    {opp.required_skills.slice(0, 6).map((skill, idx) => (
                      <Badge key={idx} bg="light" text="dark" className="skill-badge">
                        {skill}
                      </Badge>
                    ))}
                    {opp.required_skills.length > 6 && (
                      <Badge bg="light" text="dark">
                        +{opp.required_skills.length - 6} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex gap-3 text-muted small">
                  <span>👁️ {opp.views || 0} views</span>
                  <span>📝 {opp.application_count || 0} applicants</span>
                  {opp.application_deadline && (
                    <span className="text-danger">
                      ⏰ Deadline: {new Date(opp.application_deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setSelectedOpp(opp)}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedOpp(opp);
                      setShowApplyModal(true);
                    }}
                  >
                    <Send size={14} className="me-1" />
                    Apply Now
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        ))}

        {filteredOpportunities.length === 0 && !loading && (
          <Card className="text-center py-5 border-0 shadow-sm">
            <Card.Body>
              <Briefcase size={48} className="text-muted mb-3" />
              <h5 className="text-muted">No opportunities found</h5>
              <p className="text-muted">Try adjusting your filters or search query</p>
            </Card.Body>
          </Card>
        )}
      </div>

      {/* Apply Modal */}
      <Modal show={showApplyModal} onHide={() => setShowApplyModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Apply for {selectedOpp?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOpp && (
            <>
              <Alert variant="info">
                <strong>Your Profile Information:</strong>
                <ul className="mb-0 mt-2">
                  <li>Name: {currentUser.first_name} {currentUser.last_name}</li>
                  <li>Email: {currentUser.mail_id}</li>
                  {currentUser.linkedin_url && <li>LinkedIn: {currentUser.linkedin_url}</li>}
                  {currentUser.portfolio_url && <li>Portfolio: {currentUser.portfolio_url}</li>}
                </ul>
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label>Cover Message *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  placeholder="Introduce yourself and explain why you're a great fit for this opportunity..."
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Make it personal and highlight relevant experience or skills
                </Form.Text>
              </Form.Group>

              {selectedOpp.required_skills && (
                <div className="mb-3">
                  <strong className="d-block mb-2">Required Skills:</strong>
                  <div className="d-flex flex-wrap gap-2">
                    {selectedOpp.required_skills.map((skill, idx) => {
                      const hasSkill = currentUser.community_skills?.includes(skill);
                      return (
                        <Badge 
                          key={idx} 
                          bg={hasSkill ? 'success' : 'light'} 
                          text={hasSkill ? 'white' : 'dark'}
                        >
                          {hasSkill && '✓ '}{skill}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApplyModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleApply}
            disabled={!applicationMessage.trim()}
          >
            <Send size={16} className="me-1" />
            Submit Application
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .opportunity-card {
          transition: all 0.3s ease;
        }

        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
        }

        .skill-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
        }

        .opportunity-card .active {
          background-color: var(--bs-primary);
          color: white;
        }
      `}</style>
    </div>
  );
}

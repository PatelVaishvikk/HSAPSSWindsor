import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Spinner, Alert, Tabs, Tab, Modal, Form } from 'react-bootstrap';
import PortalAvatar from './PortalAvatar';

export default function MentorshipHub({ student, enqueueToast, portalAuthHeaders }) {
  const [activeTab, setActiveTab] = useState('discover');
  const [recommended, setRecommended] = useState([]);
  const [myMentorships, setMyMentorships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [requestForm, setRequestForm] = useState({ category: 'academic', message: '', goals: '' });
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState({ mandal: 'all', mukt_type: 'all', search: '' });

  const fetchDiscover = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ 
        action: 'discover', 
        mandal: filters.mandal,
        mukt_type: filters.mukt_type,
        search: filters.search
      }).toString();
      
      const resp = await fetch(`/api/student-portal/mentorship?${queryParams}`, {
        headers: portalAuthHeaders
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to fetch recommendations');
      setRecommended(data.recommended || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyMentorships = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/student-portal/mentorship?action=my_mentorships', {
        headers: portalAuthHeaders
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to fetch mentorships');
      setMyMentorships(data.mentorships || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'discover') fetchDiscover();
    else fetchMyMentorships();
  }, [activeTab, filters]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const resp = await fetch('/api/student-portal/mentorship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...portalAuthHeaders },
        body: JSON.stringify({
          mentorId: selectedMentor.id,
          category: requestForm.category,
          message: requestForm.message,
          goals: requestForm.goals.split('\n').filter(g => g.trim())
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to send request');
      
      enqueueToast({
        variant: 'success',
        title: 'Request Sent!',
        message: `Mentorship request sent to ${selectedMentor.first_name}.`
      });
      setShowRequestModal(false);
      fetchDiscover();
    } catch (err) {
      enqueueToast({ variant: 'danger', title: 'Error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (mentorshipId, newStatus) => {
    try {
      const resp = await fetch('/api/student-portal/mentorship', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...portalAuthHeaders },
        body: JSON.stringify({ mentorshipId, status: newStatus })
      });
      if (!resp.ok) throw new Error('Update failed');
      
      enqueueToast({
        variant: 'success',
        title: 'Updated',
        message: `Mentorship is now ${newStatus}.`
      });
      fetchMyMentorships();
    } catch (err) {
      enqueueToast({ variant: 'danger', title: 'Error', message: err.message });
    }
  };

  return (
    <div className="mentorship-hub animate__animated animate__fadeIn pb-5">
      <Card className="mentorship-hero border-0 mb-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', borderRadius: '1.5rem' }}>
        <Card.Body className="p-4 p-md-5 text-white position-relative">
          <div className="position-relative z-1">
            <h2 className="fw-bold mb-2">Mentorship Hub</h2>
            <p className="lead mb-0 opacity-75">Connect with professionals from your Mandal and beyond.</p>
          </div>
          <div className="mentorship-hero-decoration" />
        </Card.Body>
      </Card>

      <div className="discovery-header d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="border-0 custom-tabs">
          <Tab eventKey="discover" title="Discover Mentors" />
          <Tab eventKey="active" title="My Connections" />
        </Tabs>

        {activeTab === 'discover' && (
          <div className="d-flex flex-wrap align-items-center gap-2">
            <Form.Control 
              type="text" 
              placeholder="Search by name, role..." 
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              style={{ width: '200px', borderRadius: '2rem' }}
              className="border-0 shadow-sm"
            />
            <Form.Select 
              value={filters.mandal} 
              onChange={(e) => setFilters({...filters, mandal: e.target.value})}
              style={{ width: '140px', borderRadius: '2rem' }}
              className="border-0 shadow-sm"
            >
              <option value="all">All Mandals</option>
              <option value={student.mandal_name}>Your Mandal</option>
              <option disabled>──────────</option>
              <option value="Windsor">Windsor</option>
              <option value="Brampton">Brampton</option>
              <option value="Mississauga">Mississauga</option>
              <option value="Etobicoke">Etobicoke</option>
              <option value="Kitchener">Kitchener</option>
              <option value="London">London</option>
              <option value="Hamilton">Hamilton</option>
              <option value="Other">Other</option>
            </Form.Select>
             <Form.Select 
              value={filters.mukt_type} 
              onChange={(e) => setFilters({...filters, mukt_type: e.target.value})}
              style={{ width: '130px', borderRadius: '2rem' }}
              className="border-0 shadow-sm"
            >
              <option value="all">Any Status</option>
              <option value="Yuvak">Yuvak</option>
              <option value="Yuvati">Yuvati</option>
              <option value="Ambrish">Ambrish</option>
            </Form.Select>
          </div>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : activeTab === 'discover' ? (
        <div className="row g-4">
          {recommended.length === 0 ? (
            <div className="col-12 text-center py-5 text-muted">
              <i className="fas fa-search mb-3 fs-1 opacity-25"></i>
              <p>No mentors found matching your filters yet.</p>
            </div>
          ) : (
            recommended.map((mentor) => (
              <div key={mentor.id} className="col-12 col-md-6 col-lg-4">
                <Card className="mentor-card h-100 border-0 shadow-sm hover-lift">
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div style={{ width: 60, height: 60 }}>
                        <PortalAvatar profile={mentor} />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center justify-content-between">
                          <h6 className="fw-bold mb-0">{mentor.first_name} {mentor.last_name}</h6>
                          <Badge bg="primary-subtle" text="primary" pill>
                            {mentor.matchScore}% Match
                          </Badge>
                        </div>
                        <small className="text-muted">{mentor.community_headline || 'HSAPSS Member'}</small>
                      </div>
                    </div>
                    
                    <div className="mentor-details mb-3 flex-grow-1">
                      <div className="d-flex gap-4 mb-3">
                        <div className="flex-fill">
                           <small className="text-muted d-block mb-1">Mandal</small>
                           <div className="small fw-medium text-dark">
                             <i className="fas fa-map-marker-alt me-1 text-primary"></i>
                             {mentor.mandal_name || 'N/A'}
                           </div>
                        </div>
                        <div className="flex-fill text-end">
                           <small className="text-muted d-block mb-1">Status</small>
                           <Badge bg="light" text="dark" className="border">{mentor.mukt_type || 'HSAPSS Member'}</Badge>
                        </div>
                      </div>

                      <div className="mb-2">
                        <small className="text-muted d-block mb-1">Study & Background</small>
                        <div className="fw-medium small text-dark">
                           <i className="fas fa-graduation-cap me-2 text-primary opacity-75"></i>
                           {mentor.study_program || mentor.mukt_type || 'HSAPSS Member'}
                        </div>
                      </div>

                      {mentor.matchReasons?.length > 0 && (
                        <div className="match-reasons bg-light rounded-3 p-2 mt-3 border-start border-4 border-success">
                          {mentor.matchReasons.map((reason, idx) => (
                            <div key={idx} className="small text-success fw-medium">
                              <i className="fas fa-check me-2"></i>{reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button 
                      variant="primary" 
                      className="w-100 py-2 fw-bold shadow-sm" 
                      onClick={() => {
                        setSelectedMentor(mentor);
                        setShowRequestModal(true);
                      }}
                    >
                      Connect as Mentee
                    </Button>
                  </Card.Body>
                </Card>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="active-mentorships animate__animated animate__fadeIn">
          {myMentorships.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-link-slash mb-3 fs-1 opacity-25"></i>
              <p>You haven't started any mentorship connections yet.</p>
              <Button variant="outline-primary" size="sm" onClick={() => setActiveTab('discover')}>Find a Mentor</Button>
            </div>
          ) : (
            <div className="row g-4">
              {myMentorships.map((m) => {
                const isMentor = m.mentor._id === student._id;
                const partner = isMentor ? m.mentee : m.mentor;
                const statusColors = {
                  pending: 'warning',
                  active: 'success',
                  completed: 'info',
                  declined: 'danger',
                  cancelled: 'secondary'
                };
                
                return (
                  <div key={m._id} className="col-12">
                    <Card className="border-0 shadow-sm mentorship-row-card">
                      <Card.Body className="d-flex flex-wrap align-items-center gap-4 p-3">
                        <div style={{ width: 50, height: 50 }}>
                          <PortalAvatar profile={partner} />
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="fw-bold mb-0">{partner.first_name} {partner.last_name}</h6>
                          <div className="d-flex align-items-center gap-2">
                            <small className="text-muted">{isMentor ? 'Your Mentee' : 'Your Mentor'}</small>
                            <Badge bg={statusColors[m.status]} pill style={{ fontSize: '0.7em' }}>{m.status.toUpperCase()}</Badge>
                          </div>
                        </div>
                        <div className="mentorship-meta text-center text-md-start">
                          <small className="text-muted d-block">Category</small>
                          <span className="fw-medium">{m.category.replace('_', ' ')}</span>
                        </div>
                        <div className="actions ms-md-auto d-flex gap-2 w-100 w-md-auto">
                          {isMentor && m.status === 'pending' && (
                            <>
                              <Button variant="success" size="sm" onClick={() => handleStatusUpdate(m._id, 'active')}>Accept</Button>
                              <Button variant="outline-danger" size="sm" onClick={() => handleStatusUpdate(m._id, 'declined')}>Decline</Button>
                            </>
                          )}
                          {m.status === 'active' && (
                            <Button variant="outline-info" size="sm" onClick={() => handleStatusUpdate(m._id, 'completed')}>Mark Completed</Button>
                          )}
                          <Button variant="light" size="sm" onClick={() => window.location.href=`/messages?with=${partner._id}`}>Chat</Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Connection Modal - Enhanced & Roomier */}
      <Modal show={showRequestModal} onHide={() => setShowRequestModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0 px-4 pt-4">
          <Modal.Title className="fw-bold fs-4">Request Mentorship</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 pb-4">
          {selectedMentor && (
            <div className="d-flex align-items-center gap-3 mb-4 p-3 rounded-4 bg-light border">
              <div style={{ width: 50, height: 50 }}><PortalAvatar profile={selectedMentor} /></div>
              <div>
                <h6 className="mb-0 fw-bold">{selectedMentor.first_name} {selectedMentor.last_name}</h6>
                <small className="text-muted d-block">{selectedMentor.community_headline || 'Professional Mentor'}</small>
                <small className="text-primary fw-medium">{selectedMentor.mandal_name} Mandal</small>
              </div>
            </div>
          )}
          <Form onSubmit={handleSendRequest}>
            <div className="row">
              <div className="col-12 col-md-6 mb-4">
                <Form.Label className="fw-bold small text-uppercase text-muted silver-text tracking-wider">Help Category</Form.Label>
                <Form.Select 
                  className="form-control-lg border-2"
                  value={requestForm.category} 
                  onChange={(e) => setRequestForm({...requestForm, category: e.target.value})}
                  required
                >
                  <option value="academic">Academic Success</option>
                  <option value="career">Job Hunting & IT Prep</option>
                  <option value="settling_in">Settling in Windsor</option>
                  <option value="spiritual">Spiritual Guidance</option>
                  <option value="other">General Mentorship</option>
                </Form.Select>
              </div>
            </div>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small text-uppercase text-muted silver-text tracking-wider">Introduction Message</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={5} 
                className="form-control-lg border-2"
                placeholder="Hi! I'm looking for guidance on... I'd love to learn from your career journey."
                required
                value={requestForm.message}
                onChange={(e) => setRequestForm({...requestForm, message: e.target.value})}
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small text-uppercase text-muted silver-text tracking-wider">What are your specific goals?</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={4} 
                className="form-control-lg border-2"
                placeholder="1. Resume review for IT roles\n2. Interview preparation\n3. Industry networking"
                required
                value={requestForm.goals}
                onChange={(e) => setRequestForm({...requestForm, goals: e.target.value})}
              />
              <Form.Text className="text-muted">Enter each goal on a new line (suggested: 2-3 specific goals).</Form.Text>
            </Form.Group>

            <div className="d-flex gap-3 mt-4">
              <Button variant="light" className="px-5 py-2 fw-bold" onClick={() => setShowRequestModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" className="flex-grow-1 py-2 fw-bold shadow-sm" disabled={submitting}>
                {submitting ? <><Spinner size="sm" className="me-2" />Sending...</> : 'Send Mentorship Request'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <style jsx>{`
        .mentor-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          border-radius: 1rem;
        }
        .hover-lift:hover {
          transform: translateY(-8px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
        }
        .mentorship-row-card {
          border-radius: 1rem;
          transition: all 0.2s ease;
        }
        .mentorship-hero-decoration {
          position: absolute;
          top: -20px;
          right: -20px;
          width: 200px;
          height: 200px;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
          z-index: 0;
        }
        .custom-tabs :global(.nav-link) {
          border: none;
          color: #6b7280;
          font-weight: 500;
          padding: 0.75rem 1.5rem;
          border-bottom: 2px solid transparent;
        }
        .custom-tabs :global(.nav-link.active) {
          color: #6366f1;
          background: transparent;
          border-bottom-color: #6366f1;
        }
      `}</style>
    </div>
  );
}

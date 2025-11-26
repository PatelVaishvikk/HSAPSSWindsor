import { useState, useEffect } from 'react';
import { Card, Button, Form, Badge, Spinner, Row, Col, Alert } from 'react-bootstrap';

export default function StudySyncView({ student, portalAuthHeaders, onConnect }) {
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State - Removed as we use main profile now


  // Profile fetch removed - using main student profile


  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/student-portal/study-sync/matches', {
        headers: portalAuthHeaders || {}
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);



  if (loading) {
    return <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>;
  }



  return (
    <div className="study-sync-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Smart Connect 🚀</h2>
          <p className="text-muted mb-0">Discover peers, mentors, and study partners based on your profile.</p>
        </div>
        <Button variant="outline-primary" onClick={() => window.location.reload()}>
          <i className="fas fa-sync me-2"></i>Refresh Matches
        </Button>
      </div>

      <Row>
        {matches.length === 0 ? (
          <Col md={12}>
            <Card className="text-center p-5 border-0" style={{ background: 'var(--color-surface)' }}>
              <div className="display-1 mb-3">😴</div>
              <h4>No matches found yet</h4>
              <p className="text-muted">Try updating your profile or check back later!</p>
            </Card>
          </Col>
        ) : (
          matches.map(match => (
            <Col md={6} xl={4} key={match._id} className="mb-4">
              <Card className="h-100 border-0 shadow-sm" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <div className="position-relative">
                      {match.student?.profile_picture ? (
                        <img 
                          src={match.student.profile_picture} 
                          className="rounded-circle object-fit-cover" 
                          width="60" 
                          height="60" 
                          alt="Profile" 
                        />
                      ) : (
                        <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white" style={{width: 60, height: 60, fontSize: '1.5rem'}}>
                          {match.student?.first_name?.[0]}
                        </div>
                      )}
                      <Badge 
                        bg="success" 
                        className="position-absolute bottom-0 end-0 rounded-circle p-1 border border-2 border-dark"
                        style={{ width: 15, height: 15 }}
                      >
                        <span className="visually-hidden">Match</span>
                      </Badge>
                    </div>
                    <div className="ms-3">
                      <h5 className="mb-0">{match.student?.first_name} {match.student?.last_name}</h5>
                      <small className="text-muted">{match.student?.study_program || 'Student'}</small>
                    </div>
                    <div className="ms-auto text-center">
                      <h4 className="mb-0 text-primary">{match.matchPercent}%</h4>
                      <small className="text-muted" style={{fontSize: '0.7rem'}}>MATCH</small>
                    </div>
                  </div>

                  <div className="mb-3">
                    {match.reasons.map((reason, i) => (
                      <Badge bg="info" className="me-1 mb-1 bg-opacity-25 text-info border border-info" key={i}>
                        {reason}
                      </Badge>
                    ))}
                  </div>

                  <div className="mb-3">
                    {match.suggestion && (
                      <Alert variant="light" className="py-2 px-3 small border mb-2">
                        <i className="fas fa-lightbulb text-warning me-2"></i>
                        {match.suggestion}
                      </Alert>
                    )}
                  </div>
                  
                  <p className="small text-muted mb-4 line-clamp-2">
                    {match.bio || 'No bio provided.'}
                  </p>

                  <Button 
                    className="w-100" 
                    variant="primary"
                    onClick={() => onConnect && onConnect(match.student)}
                  >
                    <i className="fas fa-comment-alt me-2"></i> Connect
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))
        )}
      </Row>
    </div>
  );
}

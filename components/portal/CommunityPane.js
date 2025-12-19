import React, { useMemo } from 'react';
import { Card, Button, Form, Spinner, Alert, ListGroup, Badge, OverlayTrigger, Tooltip, Row, Col } from 'react-bootstrap';
import PortalAvatar from './PortalAvatar';
import { buildInitials, formatConversationTimestamp, formatPresenceText } from '../../lib/studentPortalUtils';

export default function CommunityPane({
  activePane,
  setActivePane,
  student,
  communityProfiles,
  communityLoading,
  communityError,
  communityScope,
  setCommunityScope,
  communitySearch,
  setCommunitySearch,
  handleCommunitySearchSubmit,
  refreshCommunityProfiles,
  inboxThreads,
  inboxLoading,
  inboxError,
  refreshInboxThreads,
  openConversationWithStudent,
  openProfilePreview,
  handleFollow
}) {
  // NLP-Enhanced Discovery Engine (Cosine Similarity Model)
  const suggestedPeers = useMemo(() => {
    if (!student || !communityProfiles.length) return [];
    
    // Safety: ensure it's an array for joining
    const normalize = (val) => Array.isArray(val) ? val : (typeof val === 'string' ? val.split(',').map(s => s.trim()) : []);
    
    // --- LIGHTWEIGHT NLP ENGINE ---
    const tokenize = (text) => {
      if (!text) return [];
      return text.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove punctuation
        .split(/\s+/) // Split by whitespace
        .filter(w => w.length > 2); // Filter short words/noise
    };

    const getVector = (tokens) => {
      const vec = {};
      tokens.forEach(t => vec[t] = (vec[t] || 0) + 1);
      return vec;
    };

    const cosineSimilarity = (vecA, vecB) => {
      const intersection = Object.keys(vecA).filter(t => vecB[t]);
      if (!intersection.length) return 0;

      let dotProduct = 0;
      intersection.forEach(t => dotProduct += vecA[t] * vecB[t]);

      const magnitudeA = Math.sqrt(Object.values(vecA).reduce((sum, v) => sum + v*v, 0));
      const magnitudeB = Math.sqrt(Object.values(vecB).reduce((sum, v) => sum + v*v, 0));
      
      return dotProduct / (magnitudeA * magnitudeB);
    };
    // ----------------------------

    const viewerBio = tokenize(`${student.community_headline} ${student.community_bio} ${normalize(student.community_interests).join(' ')} ${normalize(student.community_skills).join(' ')}`);
    const viewerVector = getVector(viewerBio);

    return communityProfiles
      .filter(p => !p.is_self)
      .map(p => {
        const pBio = tokenize(`${p.community_headline} ${p.community_bio} ${normalize(p.community_interests).join(' ')} ${normalize(p.community_skills).join(' ')}`);
        const pVector = getVector(pBio);
        
        let simScore = cosineSimilarity(viewerVector, pVector);
        
        // Boost for same program/district (Hard constraints)
        let boost = 0;
        if (student.study_program && p.study_program && student.study_program === p.study_program) boost += 0.3;
        if (student.mandal_name && p.mandal_name && student.mandal_name === p.mandal_name) boost += 0.2;

        const finalScore = Math.min(0.99, simScore + boost);
        const matchPct = Math.round(finalScore * 100);

        return { ...p, matchScore: matchPct };
      })
      .filter(p => p.matchScore > 10) // Only show relevant ones
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);
  }, [student, communityProfiles]);

  return (
    <div className="community-hub-advanced pb-5">
      {/* Premium Hero Section */}
      <Card className="community-hero border-0 mb-5 overflow-hidden shadow-lg animate__animated animate__fadeInDown" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
        <Card.Body className="p-4 p-lg-5 text-white position-relative">
          <Row className="align-items-center g-5">
            <Col lg={7} className="z-1">
              <div className="d-flex align-items-center gap-3 mb-4">
                <Badge bg="primary" className="px-3 py-2 rounded-pill fw-bold tracking-wider shadow-sm" style={{ fontSize: '0.7rem', background: 'linear-gradient(45deg, #6366f1, #8b5cf6)' }}>
                  RELIANT ALGORITHM V2.4
                </Badge>
                <div className="d-flex align-items-center gap-2 opacity-75">
                  <span className="pulse-dot"></span>
                  <small className="fw-bold text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Systems Online</small>
                </div>
              </div>
              
              <h1 className="display-4 fw-bold mb-3 landing-text-shimmer" style={{ letterSpacing: '-1px', color: '#f8fafc' }}>
                Your HSAPSS Network, <br /><span className="text-primary-gradient">Reimagined.</span>
              </h1>
              <p className="lead mb-5 opacity-75" style={{ maxWidth: '600px', lineHeight: '1.7' }}>
                Intelligently connecting {communityProfiles.length}+ innovators. Our matching engine identifies peers based on academic synergy and shared professional goals.
              </p>
              
              <div className="d-flex flex-wrap gap-3">
                <Button variant="primary" size="lg" className="rounded-pill px-5 fw-bold shadow-lg border-0" style={{ background: 'linear-gradient(45deg, #6366f1, #4f46e5)' }} onClick={() => setActivePane('help')}>
                   Explore Insights
                </Button>
                <Button variant="outline-light" size="lg" className="rounded-pill px-5 fw-bold hover-bg-white text-white" onClick={() => setActivePane('feed')}>
                   Network Feed
                </Button>
              </div>
            </Col>
            
            <Col lg={5} className="d-none d-lg-block">
              <div className="scientific-stats-container">
                 <div className="hero-stat-card">
                    <div className="stat-label">Network Reach</div>
                    <div className="stat-value">{(communityProfiles || []).length}</div>
                    <div className="stat-meta">Verified Members</div>
                 </div>
                 <div className="hero-stat-card featured">
                    <div className="stat-label">Active Matrix</div>
                    <div className="stat-value" style={{ color: (communityProfiles || []).filter(p => p.online).length > 0 ? '#10b981' : 'rgba(255,255,255,0.3)' }}>
                      {(communityProfiles || []).filter(p => p.online).length}
                    </div>
                    <div className="stat-meta">Real-time Connections</div>
                 </div>
              </div>
            </Col>
          </Row>
          <div className="hero-grid-pattern" />
          <div className="hero-glow-1" />
          <div className="hero-glow-2" />
        </Card.Body>
      </Card>

      <Row className="g-4">
        {/* Sidebar: Discovery & Inbox */}
        <Col xl={4}>
          {/* Discovery Filters */}
          <Card className="glass-card mb-4 border-0 shadow-sm animate__animated animate__fadeInLeft">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-2 mb-4">
                <div className="bg-primary bg-opacity-10 p-2 rounded-3 text-primary">
                   <i className="fas fa-filter"></i>
                </div>
                <h5 className="fw-bold mb-0 text-dark">Quick Discovery</h5>
              </div>

              <div className="scope-pills d-flex flex-wrap gap-2 mb-4">
                {['all', 'my_mandal', 'other_mandals'].map(scope => (
                  <button
                    key={scope}
                    className={`pill-btn ${communityScope === scope ? 'active' : ''}`}
                    onClick={() => setCommunityScope(scope)}
                  >
                    {scope === 'all' ? 'Globally' : scope === 'my_mandal' ? 'My Mandal' : 'Other Districts'}
                  </button>
                ))}
              </div>

              <Form onSubmit={handleCommunitySearchSubmit}>
                <div className="search-box position-relative">
                   <Form.Control
                     type="text"
                     placeholder="Search by name, skill, or role..."
                     value={communitySearch}
                     onChange={(e) => setCommunitySearch(e.target.value)}
                     className="rounded-pill ps-4 py-3 border-0 bg-light shadow-inner"
                   />
                   <Button type="submit" variant="primary" className="search-submit-btn rounded-circle shadow">
                     <i className="fas fa-search"></i>
                   </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>

          {/* Conversations */}
          <Card className="glass-card border-0 shadow-sm animate__animated animate__fadeInLeft" style={{ animationDelay: '0.1s' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold mb-0 text-dark">Conversations</h5>
                <Button variant="light" size="sm" onClick={refreshInboxThreads} className="rounded-circle">
                  <i className="fas fa-redo-alt small"></i>
                </Button>
              </div>

              {inboxLoading && (inboxThreads || []).length === 0 ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" size="sm" />
                </div>
              ) : (inboxThreads || []).length === 0 ? (
                <div className="text-center py-5 opacity-50 small">No active chats yet.</div>
              ) : (
                <div className="inbox-list custom-scrollbar">
                  {(inboxThreads || []).map(thread => (
                    <div 
                      key={thread.student.id} 
                      className="inbox-item d-flex align-items-center gap-3 p-3 rounded-4 mb-2 hover-bg"
                      onClick={() => openConversationWithStudent(thread)}
                      role="button"
                    >
                      <div className="position-relative" style={{ width: 45, height: 45 }}>
                        <PortalAvatar profile={thread.student} />
                        {thread.student.online && <div className="online-badge-dot" />}
                      </div>
                      <div className="flex-grow-1 overflow-hidden">
                        <div className="d-flex justify-content-between">
                           <span className="fw-bold text-dark text-truncate small">{thread.student.first_name} {thread.student.last_name}</span>
                           <span className="text-muted" style={{ fontSize: '0.7rem' }}>{formatConversationTimestamp(thread.lastTimestamp)}</span>
                        </div>
                        <p className="text-muted small mb-0 text-truncate">{thread.lastMessage || 'Start a chat...'}</p>
                      </div>
                      {thread.unreadCount > 0 && <Badge pill bg="danger" className="ms-auto">{thread.unreadCount}</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Main Feed: AI Suggestions + Discovery Grid */}
        <Col xl={8}>
          {/* AI Suggestions (Only show if not searching) */}
          {!communitySearch && suggestedPeers.length > 0 && (
            <div className="ai-suggestions mb-5 animate__animated animate__fadeIn">
               <div className="d-flex align-items-center gap-2 mb-4">
                 <div className="bg-warning bg-opacity-10 p-2 rounded-3 text-warning">
                    <i className="fas fa-sparkles"></i>
                 </div>
                 <h5 className="fw-bold mb-0 text-dark">Suggested for You</h5>
                 <Badge bg="warning-subtle" text="warning" className="ms-2 fw-normal">Smart Matching</Badge>
               </div>
                              <div className="d-flex flex-column gap-3">
                    {suggestedPeers.map(peer => (
                      <div key={peer.id} className="suggested-peer-card p-3 rounded-4 border border-light shadow-sm hover-lift bg-white">
                         <div className="d-flex align-items-center gap-3">
                            <div className="position-relative" style={{ width: 52, height: 52 }}>
                               <PortalAvatar profile={peer} />
                               {peer.online && <div className="online-badge-dot" />}
                            </div>
                            <div className="flex-grow-1 overflow-hidden">
                               <div className="d-flex justify-content-between align-items-start">
                                  <h6 className="fw-bold mb-0 text-dark text-truncate">{peer.first_name} {peer.last_name}</h6>
                                  <Badge bg="primary-subtle" text="primary" className="rounded-pill px-2 py-1" style={{ fontSize: '0.6rem' }}>
                                    {peer.matchScore}% SYNC
                                  </Badge>
                               </div>
                               <small className="text-muted d-block text-truncate mt-1" style={{ fontSize: '0.75rem' }}>
                                 {(peer.study_program && peer.study_program !== 'Student') ? peer.study_program : (peer.mukt_type || 'HSAPSS Member')}
                               </small>
                            </div>
                            <Button 
                              variant="light" 
                              size="sm" 
                              className="rounded-circle shadow-sm"
                              onClick={() => openProfilePreview(peer)}
                            >
                              <i className="fas fa-chevron-right text-primary" style={{ fontSize: '0.8rem' }}></i>
                            </Button>
                         </div>
                      </div>
                    ))}
                  </div>
            </div>
          )}

          {/* Discovery Grid */}
          <div className="discovery-grid animate__animated animate__fadeIn" style={{ animationDelay: '0.2s' }}>
             <div className="d-flex align-items-center justify-content-between mb-4">
                <h5 className="fw-bold mb-0 text-dark">Explore Members</h5>
                <small className="text-muted">{communityProfiles.length} Total Profiles</small>
             </div>

             {communityError && <Alert variant="danger">{communityError}</Alert>}
             
             {communityLoading && communityProfiles.length === 0 ? (
               <div className="text-center py-5 text-muted">
                 <Spinner animation="border" className="mb-3" />
                 <p>Finding your people...</p>
               </div>
             ) : communityProfiles.length === 0 ? (
               <div className="text-center py-5">
                 <i className="fas fa-users-slash fs-1 opacity-25 mb-3"></i>
                 <p>No profiles match your filters.</p>
               </div>
             ) : (
               <Row className="g-4">
                 {(communityProfiles || []).map(profile => (
                   <Col key={profile.id} md={6}>
                     <Card className="profile-card border-0 shadow-sm overflow-hidden h-100 hover-float">
                        <div className="profile-card-header" style={{ background: `linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)` }}>
                           <div className="p-4 d-flex align-items-center gap-4">
                              <div className="position-relative shadow-sm rounded-circle p-1 bg-white" style={{ width: 80, height: 80, minWidth: 80 }}>
                                <div className="profile-avatar-wrapper rounded-circle overflow-hidden w-100 h-100">
                                  <PortalAvatar profile={profile} />
                                </div>
                                {profile.online && <div className="online-glow" />}
                              </div>
                              <div className="flex-grow-1 overflow-hidden">
                                 <h6 className="fw-bold mb-1 d-flex align-items-center gap-2 text-dark" style={{ fontSize: '1.05rem', letterSpacing: '-0.3px' }}>
                                   {profile.first_name} {profile.last_name}
                                   {profile.is_self && <Badge bg="primary" style={{ fontSize: '0.6rem' }}>You</Badge>}
                                 </h6>
                                 <small className="text-muted d-block text-truncate mb-2 fw-semibold" style={{ fontSize: '0.75rem' }}>{profile.community_headline || 'HSAPSS Member'}</small>
                                  <div className="d-flex flex-wrap gap-2">
                                     <Badge bg="primary-subtle" text="primary" className="border border-primary border-opacity-10" style={{ fontSize: '0.7rem' }}>{profile.mandal_name || 'Windsor'}</Badge>
                                     <Badge bg="success-subtle" text="success" className="border border-success border-opacity-10" style={{ fontSize: '0.7rem' }}>{profile.mukt_type || 'Yuvak'}</Badge>
                                     {profile.available_to_help && (
                                       <Badge bg="warning-subtle" text="warning" className="border border-warning border-opacity-10" style={{ fontSize: '0.7rem' }}>Available to Help</Badge>
                                     )}
                                  </div>
                              </div>
                           </div>
                        </div>
                         <Card.Body className="p-3 bg-white d-flex flex-column h-100">
                            <div className="mb-2 bg-light p-2 rounded-3 border-start border-primary border-4">
                               <h6 className="fw-bold x-small text-muted text-uppercase mb-1 tracking-wider" style={{ fontSize: '0.6rem' }}>Institution & Program</h6>
                               <div className="d-flex align-items-center gap-2">
                                 <i className="fas fa-university text-primary opacity-50" style={{ fontSize: '0.7rem' }}></i>
                                 <p className="small text-dark mb-0 fw-bold text-truncate">{profile.study_institution || 'HSAPSS Network'}</p>
                               </div>
                               <small className="text-muted text-truncate d-block ps-3 ms-1" style={{ fontSize: '0.7rem' }}>
                                 {(profile.study_program && profile.study_program !== 'Student') ? profile.study_program : (profile.mukt_type || 'HSAPSS Member')}
                               </small>
                            </div>
                            <p className="small text-muted mb-3 profile-bio-limit px-1">{profile.community_bio || 'No bio provided for this member.'}</p>
                           
                           {(() => {
                             const skills = Array.isArray(profile.community_skills) ? profile.community_skills : (typeof profile.community_skills === 'string' ? profile.community_skills.split(',').map(s => s.trim()) : []);
                             if (skills.length === 0) return null;
                             return (
                               <div className="d-flex flex-wrap gap-2 mb-4">
                                  {skills.slice(0, 3).map(skill => (
                                    <span key={skill} className="skill-chip">#{skill}</span>
                                  ))}
                                  {skills.length > 3 && <span className="small text-muted">+{skills.length - 3}</span>}
                               </div>
                             );
                           })()}

                           <div className="mt-auto d-flex gap-2">
                               {!profile.is_self && (
                                 <Button 
                                   variant={(student.following || []).includes(profile.id || profile._id) ? "outline-secondary" : profile.has_requested_follow ? "light" : "primary"} 
                                   size="sm" 
                                   className={`flex-grow-1 rounded-pill py-2 fw-bold shadow-sm ${profile.has_requested_follow ? 'text-muted border-0 bg-light opacity-75' : ''}`}
                                   style={{ fontSize: '0.8rem' }}
                                   disabled={profile.has_requested_follow && !(student.following || []).includes(profile.id || profile._id)}
                                   onClick={() => handleFollow(profile.id || profile._id, (student.following || []).includes(profile.id || profile._id) ? 'unfollow' : 'request')}
                                 >
                                   {(student.following || []).includes(profile.id || profile._id) ? 'Unfollow' : profile.has_requested_follow ? 'Requested' : 'Follow'}
                                 </Button>
                               )}
                              {!profile.is_self && (
                                <Button 
                                  variant="light" 
                                  size="sm" 
                                  className="rounded-circle d-flex align-items-center justify-content-center" 
                                  style={{ width: 38, height: 38 }}
                                  onClick={() => openConversationWithStudent(profile)}
                                >
                                  <i className="fas fa-comment-alt"></i>
                                </Button>
                              )}
                              <Button 
                                variant="light" 
                                size="sm" 
                                className="rounded-circle d-flex align-items-center justify-content-center" 
                                style={{ width: 38, height: 38 }}
                                onClick={() => openProfilePreview(profile)}
                              >
                                <i className="fas fa-expand"></i>
                              </Button>
                           </div>
                        </Card.Body>
                     </Card>
                   </Col>
                 ))}
               </Row>
             )}
          </div>
        </Col>
      </Row>

      <style jsx>{`
        .community-hub-advanced {
          background: #f1f5f9;
          min-height: 100vh;
        }
        .community-hero {
          position: relative;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
        }
        .hero-grid-pattern {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 30px 30px;
          opacity: 0.5;
        }
        .hero-glow-1 {
          position: absolute;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
          top: -250px; left: -100px;
        }
        .hero-glow-2 {
          position: absolute;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%);
          bottom: -300px; right: -100px;
        }
        .text-primary-gradient {
          background: linear-gradient(45deg, #a5b4fc, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .scientific-stats-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        .hero-stat-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          padding: 1.75rem;
          border-radius: 1.5rem;
          transition: all 0.3s ease;
        }
        .hero-stat-card:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateX(-5px);
        }
        .hero-stat-card.featured {
          background: rgba(99, 102, 241, 0.05);
          border-color: rgba(99, 102, 241, 0.2);
        }
        .stat-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 800;
          opacity: 0.6;
          margin-bottom: 0.5rem;
        }
        .stat-value {
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 0.5rem;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .stat-meta {
          font-size: 0.75rem;
          opacity: 0.5;
          font-weight: 500;
        }
        .pulse-dot {
          width: 8px; height: 8px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 0 transparent;
          animation: pulse-green 2s infinite;
        }
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .suggested-peer-card {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .suggested-peer-card:hover {
          transform: translateX(5px);
          border-color: rgba(99, 102, 241, 0.3) !important;
        }
        .glass-card {
          background: white;
          border-radius: 1.5rem;
          transition: box-shadow 0.3s ease;
        }
        .pill-btn {
          border: none;
          background: #f1f5f9;
          color: #64748b;
          padding: 0.6rem 1.25rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 700;
          transition: all 0.2s ease;
        }
        .pill-btn.active {
          background: #0f172a;
          color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .profile-card {
          border-radius: 1.5rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.05) !important;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1) !important;
        }
        .tracking-wider { letter-spacing: 0.1em; }
        .tracking-widest { letter-spacing: 0.2em; }
        .shadow-inner { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05); }
      `}</style>
    </div>
  );
}

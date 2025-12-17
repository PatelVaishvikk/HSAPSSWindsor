
import React from 'react';
import { Card, Button, Form, Spinner, Alert, ListGroup, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
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
  return (
    <div className="community-pane">
      <Card className="community-hero-card border-0 shadow-sm mb-4 text-white">
        <Card.Body className="p-4 p-lg-5 position-relative">
          <div className="community-hero-overlay" />
          <div className="position-relative">
            <h3 className="fw-bold mb-2">Community Hub</h3>
            <p className="mb-4 lead">
              Celebrate wins, find collaborators, and unlock help from fellow HSAPSS students.
            </p>
            <div className="d-flex flex-wrap gap-3">
              <Button
                variant="light"
                onClick={() => setActivePane('help')}
                className="text-primary fw-semibold"
              >
                <i className="fas fa-life-ring me-2"></i>
                Ask for help
              </Button>
              <Button
                variant="outline-light"
                className="fw-semibold text-white"
                onClick={() => openConversationWithStudent(
                  communityProfiles.find((profile) => !profile.is_self) || communityProfiles[0] || {}
                )}
                disabled={communityProfiles.length === 0}
              >
                <i className="fas fa-paper-plane me-2"></i>
                Say hello
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      <div className="row g-4 align-items-start">
        <div className="col-12 col-xl-4">
          <Card className="border-0 shadow-sm mb-4 community-search-card">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h6 className="fw-semibold mb-1">Find your people</h6>
                  <small className="text-muted">
                    Search by name, skills, program, or interests.
                  </small>
                </div>
              </div>
              
              <div className="d-flex gap-2 mb-3">
                <Button
                  variant={communityScope === 'all' ? 'primary' : 'outline-primary'}
                  size="sm"
                  className="flex-grow-1"
                  onClick={() => setCommunityScope('all')}
                >
                  All
                </Button>
                <Button
                  variant={communityScope === 'my_mandal' ? 'primary' : 'outline-primary'}
                  size="sm"
                  className="flex-grow-1"
                  onClick={() => setCommunityScope('my_mandal')}
                >
                  My Mandal
                </Button>
                <Button
                  variant={communityScope === 'other_mandals' ? 'primary' : 'outline-primary'}
                  size="sm"
                  className="flex-grow-1"
                  onClick={() => setCommunityScope('other_mandals')}
                >
                  Other
                </Button>
              </div>

              <Form className="community-search-form" onSubmit={handleCommunitySearchSubmit}>
                <div className="d-flex flex-column gap-3">
                  <Form.Control
                    type="search"
                    placeholder="Type a keyword to explore"
                    value={communitySearch}
                    onChange={(event) => setCommunitySearch(event.target.value)}
                  />
                  <div className="d-flex gap-2">
                    <Button type="submit" variant="primary" className="flex-grow-1" disabled={communityLoading}>
                      {communityLoading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" role="status" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-search me-2"></i>
                          Search
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={() => {
                        setCommunitySearch('');
                        refreshCommunityProfiles('');
                      }}
                      disabled={communityLoading}
                    >
                      <i className="fas fa-sync-alt"></i>
                    </Button>
                  </div>
                </div>
              </Form>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm community-inbox-card">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6 className="fw-semibold mb-1">Conversations</h6>
                  <small className="text-muted">
                    {inboxThreads.length
                      ? 'Pick up where you left off.'
                      : 'Start a fresh conversation with someone new.'}
                  </small>
                </div>
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => refreshInboxThreads()}
                  disabled={inboxLoading}
                >
                  <i className="fas fa-rotate-right"></i>
                </Button>
              </div>
              {inboxError && (
                <Alert variant="warning" className="py-2">
                  {inboxError}
                </Alert>
              )}
              {inboxLoading && inboxThreads.length === 0 ? (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status" />
                </div>
              ) : inboxThreads.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  No conversations yet. Reach out to a student that inspires you.
                </div>
              ) : (
                <ListGroup variant="flush" className="conversation-thread-list">
                  {inboxThreads.map((thread) => (
                    <ListGroup.Item
                      key={thread.student.id}
                      action
                      onClick={() => openConversationWithStudent(thread)}
                      className="d-flex gap-3 align-items-start"
                    >
                      <div className="conversation-avatar">
                        <div className="d-flex align-items-center justify-content-center text-primary fw-bold bg-body rounded-circle" style={{ width: 40, height: 40 }}>
                            {buildInitials(thread.student.first_name, thread.student.last_name)}
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <div
                            className="fw-semibold conversation-thread-name"
                            role="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openProfilePreview(thread.student);
                            }}
                          >
                            {thread.student.first_name} {thread.student.last_name}
                          </div>
                          <small className="text-muted">
                            {formatConversationTimestamp(thread.lastTimestamp)}
                          </small>
                        </div>
                        <div className="thread-presence text-muted small mb-1">
                          <span
                            className={`presence-dot ${thread.student.online ? 'presence-dot-online' : ''}`}
                            aria-hidden="true"
                          ></span>
                          {formatPresenceText(thread.student.online, thread.student.last_seen)}
                        </div>
                        <div className="text-muted small text-truncate mb-1">
                          {thread.lastMessage || 'Say hi and introduce yourself.'}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {thread.student.study && (
                            <span className="badge bg-primary-subtle text-primary-emphasis">
                              {thread.student.study}
                            </span>
                          )}
                          {thread.unreadCount > 0 && (
                            <Badge bg="primary" pill>
                              {thread.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </div>

        <div className="col-12 col-xl-8">
          {communityError && (
            <Alert variant="danger" className="mb-4">
              {communityError}
            </Alert>
          )}

          {communityLoading && communityProfiles.length === 0 ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" className="text-primary" />
              <p className="text-muted small mt-3 mb-0">Loading community profiles...</p>
            </div>
          ) : communityProfiles.length === 0 ? (
            <div className="text-center py-5">
              <div className="empty-state-icon mb-3">
                <i className="fas fa-users"></i>
              </div>
              <h6 className="fw-semibold mb-2">No matching profiles yet</h6>
              <p className="text-muted small mb-0">
                Encourage your friends to update their profiles or adjust your search filters.
              </p>
            </div>
          ) : (
            <div className="row g-4">
              {communityProfiles.map((profile) => (
                <div key={profile.id} className="col-12 col-md-6">
                  <Card className="community-card h-100 border-0 shadow-sm">
                    <Card.Body className="d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <div className="d-flex align-items-center gap-2">
                            <div className="conversation-avatar conversation-avatar-sm">
                              <PortalAvatar profile={profile} />
                            </div>
                            <div>
                              <h6
                                className="fw-bold mb-0 community-name-link"
                                role="button"
                                onClick={() => openProfilePreview(profile)}
                              >
                                {profile.first_name} {profile.last_name}{' '}
                                {profile.is_self && (
                                  <Badge bg="primary" pill>
                                    You
                                  </Badge>
                                )}
                              </h6>
                              {profile.community_headline && (
                                <p className="text-muted small mb-0">{profile.community_headline}</p>
                              )}
                              <div className="d-flex gap-1 mt-1 flex-wrap">
                                  <Badge bg="info" className="fw-normal" style={{ fontSize: '0.7em' }}>
                                    {profile.mandal_name || 'Windsor'}
                                  </Badge>
                                  <Badge bg="warning" text="dark" className="fw-normal" style={{ fontSize: '0.7em' }}>
                                    {profile.mukt_type || 'Yuvak'}
                                  </Badge>
                              </div>
                              <div className="presence-line text-muted small mt-1">
                                <span
                                  className={`presence-dot ${profile.online ? 'presence-dot-online' : ''}`}
                                  aria-hidden="true"
                                ></span>
                                {formatPresenceText(profile.online, profile.last_seen)}
                              </div>
                            </div>
                          </div>
                        </div>
                        {profile.available_to_help && (
                          <Badge bg="success" pill>
                            Available to help
                          </Badge>
                        )}
                      </div>
                      {profile.community_bio && (
                        <p className="text-muted small mb-3">{profile.community_bio}</p>
                      )}
                      {profile.community_skills?.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          {profile.community_skills.map((skill) => (
                            <span
                              key={`${profile.id}-${skill}`}
                              className="badge rounded-pill bg-primary-subtle text-primary-emphasis"
                            >
                              <i className="fas fa-star me-1"></i>
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                      {profile.community_interests?.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          {profile.community_interests.map((interest) => (
                            <span
                              key={`${profile.id}-interest-${interest}`}
                              className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}
                      <ul className="list-unstyled small mb-3">
                        {profile.study && (
                          <li className="mb-1">
                            <i className="fas fa-graduation-cap me-2 text-primary"></i>
                            {profile.study}
                          </li>
                        )}
                        {profile.post_graduation_plan && (
                          <li className="mb-1">
                            <i className="fas fa-briefcase me-2 text-primary"></i>
                            {profile.post_graduation_plan}
                          </li>
                        )}
                      </ul>
                      {profile.help_offering && (
                        <div className="small bg-primary-subtle text-primary-emphasis rounded-3 p-3 mb-3">
                          <i className="fas fa-hands-helping me-2"></i>
                          {profile.help_offering}
                        </div>
                      )}
                      {(profile.mail_id || profile.phone) && (
                        <div className="community-contact small mb-3">
                          {profile.mail_id && (
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip id={`tooltip-email-${profile.id}`}>Copy email</Tooltip>}
                            >
                              <button
                                type="button"
                                className="contact-chip"
                                onClick={() => {
                                  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                                    navigator.clipboard.writeText(profile.mail_id);
                                  }
                                }}
                              >
                                <i className="fas fa-envelope me-2"></i>
                                {profile.mail_id}
                              </button>
                            </OverlayTrigger>
                          )}
                          {profile.phone && (
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip id={`tooltip-phone-${profile.id}`}>Copy phone</Tooltip>}
                            >
                              <button
                                type="button"
                                className="contact-chip"
                                onClick={() => {
                                  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                                    navigator.clipboard.writeText(profile.phone);
                                  }
                                }}
                              >
                                <i className="fas fa-phone me-2"></i>
                                {profile.phone}
                              </button>
                            </OverlayTrigger>
                          )}
                        </div>
                      )}
                      <div className="d-flex flex-wrap gap-2 mt-auto">
                        {!profile.is_self && (
                          <Button
                            size="sm"
                            variant={
                              student.following?.includes(profile.id)
                                ? "outline-secondary"
                                : profile.has_requested_follow
                                  ? "secondary"
                                  : "primary"
                            }
                            disabled={profile.has_requested_follow}
                            onClick={() => {
                              const isFollowing = student.following?.includes(profile.id);
                              handleFollow(profile.id, isFollowing ? 'unfollow' : 'request');
                            }}
                          >
                            <i className={`fas fa-${student.following?.includes(profile.id)
                              ? 'user-check'
                              : profile.has_requested_follow
                                ? 'clock'
                                : 'user-plus'
                              } me-2`}></i>
                            {student.following?.includes(profile.id)
                              ? 'Following'
                              : profile.has_requested_follow
                                ? 'Requested'
                                : 'Follow'}
                          </Button>
                        )}
                        {!profile.is_self && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => openConversationWithStudent(profile)}
                          >
                            <i className="fas fa-message me-2"></i>
                            Message
                          </Button>
                        )}
                        {!profile.is_self && profile.available_to_help && (
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() =>
                              openConversationWithStudent(
                                profile,
                                `Hey ${profile.first_name || ''}! I saw you're available to help with "${profile.help_offering || 'students'}" and would love to connect.`
                              )
                            }
                          >
                            <i className="fas fa-hands-helping me-2"></i>
                            Request Support
                          </Button>
                        )}
                        {profile.linkedin_url && (
                          <a
                            href={profile.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline-secondary btn-sm"
                          >
                            <i className="fab fa-linkedin me-2"></i>
                            LinkedIn
                          </a>
                        )}
                        {profile.portfolio_url && (
                          <a
                            href={profile.portfolio_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline-secondary btn-sm"
                          >
                            <i className="fas fa-globe me-2"></i>
                            Portfolio
                          </a>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

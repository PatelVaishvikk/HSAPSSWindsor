
import React from 'react';
import { Button } from 'react-bootstrap';
import { buildInitials } from '../../lib/studentPortalUtils';

export default function PortalSidebar({
  student,
  activePane,
  setActivePane,
  showNotificationPanel,
  setShowNotificationPanel,
  unreadNotificationCount,
  portalMeta,
  handleLogout,
  setShowThemePicker,
  className,
  style
}) {
  if (!student) return null;

  return (
    <div className={`d-flex flex-column sidebar-modern h-100 ${className || ''}`} style={{ width: 280, overflow: 'hidden', ...style }}>
      {/* Header */}
      <div className="p-4 pb-2 flex-shrink-0">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-3 overflow-hidden shadow-sm" style={{ width: 48, height: 48 }}>
              <img src="/windsor.jpg" alt="HSAPSS Logo" className="w-100 h-100 object-fit-cover" />
            </div>
            <div>
              <h5 className="fw-bold mb-0 text-dark">HSAPSS</h5>
              <small className="text-muted">Student Portal</small>
            </div>
          </div>
          <Button
            variant="light"
            size="sm"
            className="rounded-circle"
            onClick={() => setShowThemePicker(true)}
            title="Change Theme"
          >
            <i className="fas fa-palette text-muted"></i>
          </Button>
        </div>
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-grow-1 overflow-y-auto custom-scrollbar px-3 py-2" style={{ minHeight: 0 }}>
        <div className="d-flex flex-column gap-2">
          <Button
            variant="link"
            className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${activePane === 'profile' ? 'active' : ''}`}
            onClick={() => setActivePane('profile')}
          >
            <i className={`fas fa-user-circle ${activePane === 'profile' ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
            <span>My Profile</span>
          </Button>

          <Button
            variant="link"
            className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${activePane === 'community' ? 'active' : ''}`}
            onClick={() => setActivePane('community')}
          >
            <i className={`fas fa-users ${activePane === 'community' ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
            <span>Community Hub</span>
          </Button>

          <Button
            variant="link"
            className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${activePane === 'study-sync' ? 'active' : ''}`}
            onClick={() => setActivePane('study-sync')}
          >
            <i className={`fas fa-fire ${activePane === 'study-sync' ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
            <span>Study Sync</span>
          </Button>

          <Button
            variant="link"
            className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${activePane === 'groups' ? 'active' : ''}`}
            onClick={() => setActivePane('groups')}
          >
            <i className={`fas fa-comments ${activePane === 'groups' ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
            <span>Groups</span>
          </Button>

          <Button
            variant="link"
            className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${activePane === 'help' ? 'active' : ''}`}
            onClick={() => setActivePane('help')}
          >
            <i className={`fas fa-hands-helping ${activePane === 'help' ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
            <span>Help Board</span>
          </Button>

          <Button
            variant="link"
            className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${activePane === 'library' ? 'active' : ''}`}
            onClick={() => setActivePane('library')}
          >
            <i className={`fas fa-book ${activePane === 'library' ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
            <span>The Archive</span>
          </Button>

          <Button
            variant="link"
            className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${activePane === 'feed' ? 'active' : ''}`}
            onClick={() => setActivePane('feed')}
          >
            <i className={`fas fa-rss ${activePane === 'feed' ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
            <span>Feed</span>
          </Button>

          <Button
            variant="link"
            className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${showNotificationPanel ? 'active' : ''}`}
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
          >
            <div className="position-relative">
              <i className={`fas fa-bell ${showNotificationPanel ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
              {unreadNotificationCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                  {unreadNotificationCount}
                </span>
              )}
            </div>
            <span>Notifications</span>
          </Button>

          <Button
            variant="link"
            className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${activePane === 'settings' ? 'active' : ''}`}
            onClick={() => setActivePane('settings')}
          >
            <i className={`fas fa-cog ${activePane === 'settings' ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
            <span>Settings</span>
          </Button>

          {portalMeta.can_access_admin && (
            <div className="mt-4">
              <Button
                variant="link"
                className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${activePane === 'analytics' ? 'active' : ''}`}
                onClick={() => setActivePane('analytics')}
              >
                <i className={`fas fa-chart-line ${activePane === 'analytics' ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
                <span>Analytics</span>
              </Button>
              <div className="text-uppercase text-muted fw-bold small px-3 mb-2 mt-3" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>Admin Tools</div>
              {portalMeta.admin_shortcuts.map((shortcut, idx) => (
                <Button
                  key={idx}
                  variant="light"
                  href={shortcut.href}
                  className="text-start d-flex align-items-center gap-3 px-3 py-2 rounded-3 border-0 bg-transparent w-100 text-dark mb-1 nav-btn"
                >
                  <i className={`${shortcut.icon} text-primary`} style={{ width: 24 }}></i>
                  <span>{shortcut.label}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 pt-3 border-top flex-shrink-0 bg-surface">
        <div className="d-flex align-items-center gap-3 px-2 mb-3">
          <div className="bg-body rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold" style={{ width: 40, height: 40 }}>
            {buildInitials(student?.first_name, student?.last_name)}
          </div>
          <div className="overflow-hidden">
            <div className="fw-bold text-truncate text-main">{student?.first_name}</div>
            <div className="small text-muted text-truncate">{student?.phone}</div>
          </div>
        </div>
        <Button variant="light" className="w-100 border-0 text-danger bg-danger bg-opacity-10 hover-danger" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt me-2"></i>
          Sign Out
        </Button>
      </div>
      <div className="pb-5"></div>
    </div>
  );
}

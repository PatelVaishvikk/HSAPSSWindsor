// components/Navbar.js
import { useMemo, useState } from 'react';
import { Navbar, Nav, Container, Button, Badge } from 'react-bootstrap';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useNotification } from '../contexts/NotificationContext';
import { NotificationPanel } from './NotificationSystem';

import DarkModeToggle from './DarkModeToggle';

const Navigation = () => {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotification();

  const navItems = useMemo(
    () => [
      { href: '/admin/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
      { href: '/students-table', label: 'Yuvaks', icon: 'fas fa-users' },
      { href: '/yuvak-details-dashboard', label: 'Details', icon: 'fas fa-address-card' },
      { href: '/moved-out-students', label: 'Locations', icon: 'fas fa-map-marker-alt' },
      { href: '/call-logs', label: 'Calls', icon: 'fas fa-phone-volume' },
      { href: '/attendance', label: 'Attendance', icon: 'fas fa-calendar-check' },
      { href: '/grocery', label: 'Grocery', icon: 'fas fa-shopping-basket' },
      { href: '/add-yuvak', label: 'Add Yuvak', icon: 'fas fa-user-plus' }
    ],
    []
  );

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (error) {
      // no-op, still redirect
    } finally {
      router.replace('/admin/login');
    }
  };

  const isActive = (href) => router.pathname === href;

  return (
    <>
      <header className="hsapss-navbar-wrapper">
        <Navbar expand="lg" className="hsapss-navbar shadow-sm">
          <Container fluid className="px-3 px-lg-4">
            <Link href="/admin/dashboard" legacyBehavior>
              <Navbar.Brand as="a" className="hsapss-brand d-flex align-items-center gap-3">
                <span className="brand-mark d-inline-flex align-items-center justify-content-center">
                  <img src="/windsor.jpg" alt="HSAPSS Windsor Logo" className="brand-logo" />
                </span>
                <span className="brand-text d-flex flex-column">
                  <span className="brand-title">HSAPSS Windsor</span>
                  <span className="brand-subtitle">Admin console</span>
                </span>
              </Navbar.Brand>
            </Link>


            <div className="d-flex align-items-center gap-2 me-2 d-lg-none ms-auto">
                <Button 
                  variant="light" 
                  className="position-relative border-0 bg-transparent p-1"
                  onClick={() => setShowNotifications(true)}
                >
                  <i className="fas fa-bell fa-lg text-secondary"></i>
                  {unreadCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                      {unreadCount}
                      <span className="visually-hidden">unread messages</span>
                    </span>
                  )}
                </Button>
            </div>

            <Navbar.Toggle aria-controls="primary-nav" className="border-0 shadow-none" />

            <Navbar.Collapse id="primary-nav">
              <Nav className="ms-lg-auto align-items-lg-center gap-lg-1 flex-wrap">
                {navItems.map((item) => (
                  <Link href={item.href} legacyBehavior key={item.href}>
                    <Nav.Link
                      as="a"
                      active={isActive(item.href)}
                      className="hsapss-nav-link d-inline-flex align-items-center gap-2"
                    >
                      <span className="nav-link-icon">
                        <i className={item.icon} aria-hidden="true"></i>
                      </span>
                      <span>{item.label}</span>
                    </Nav.Link>
                  </Link>
                ))}
              </Nav>

              <div className="hsapss-nav-utilities ms-lg-4 mt-3 mt-lg-0">
                <Button 
                  variant="light" 
                  className="position-relative border-0 bg-transparent d-none d-lg-block"
                  onClick={() => setShowNotifications(true)}
                >
                  <i className="fas fa-bell fa-lg text-secondary"></i>
                  {unreadCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {unreadCount}
                      <span className="visually-hidden">unread messages</span>
                    </span>
                  )}
                </Button>

                <Badge bg="light" text="dark" className="admin-status-pill">
                  <i className="fas fa-shield-alt me-2 text-secondary"></i>
                  Admin
                </Badge>
                <div className="dark-mode-wrapper">
                  <DarkModeToggle />
                </div>
                <Button
                  className="hsapss-logout-btn"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  <i className="fas fa-sign-out-alt me-2"></i>
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </Button>
              </div>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      </header>

      <NotificationPanel show={showNotifications} onHide={() => setShowNotifications(false)} />

      <style jsx global>{`
        .hsapss-navbar-wrapper {
          position: sticky;
          top: 0;
          z-index: 1020;
          padding: 0;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
        }

        .hsapss-navbar {
          padding: 0.65rem 0;
          background: #ffffff;
          box-shadow: none;
          border: 0;
        }

        .hsapss-brand {
          color: #111827 !important;
          text-decoration: none;
        }

        .hsapss-brand:hover {
          color: #111827 !important;
        }

        .brand-mark {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .brand-logo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .brand-title {
          font-size: 1rem;
          font-weight: 750;
          letter-spacing: 0;
          line-height: 1;
        }

        .brand-subtitle {
          font-size: 0.78rem;
          letter-spacing: 0;
          text-transform: none;
          color: #64748b;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .navbar-toggler:focus {
          box-shadow: 0 0 0 0.15rem rgba(148, 197, 253, 0.6);
        }

        .navbar-collapse {
          background: #ffffff;
          border-radius: 8px;
          margin-top: 0.75rem;
          padding: 1rem;
          border: 1px solid #e5e7eb;
        }

        .hsapss-nav-link {
          padding: 0.5rem 0.7rem !important;
          margin: 0;
          border-radius: 8px;
          font-weight: 600;
          color: #334155 !important;
          transition: background 0.18s ease, color 0.18s ease;
          position: relative;
          overflow: hidden;
        }

        .hsapss-nav-link .nav-link-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 8px;
          background: #f1f5f9;
          color: #475569;
          font-size: 0.85rem;
        }

        .hsapss-nav-link:hover,
        .hsapss-nav-link:focus {
          background: #f8fafc;
          color: #111827 !important;
        }

        .hsapss-nav-link.active {
          background: #111827;
          color: #ffffff !important;
          box-shadow: none;
        }

        .hsapss-nav-link.active .nav-link-icon {
          background: rgba(255, 255, 255, 0.14);
          color: #ffffff;
        }

        .hsapss-nav-utilities {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-wrap: wrap;
        }

        .admin-status-pill {
          border: 1px solid #e5e7eb;
          background: #ffffff !important;
          color: #334155;
          border-radius: 999px;
          padding: 0.42rem 0.8rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
        }

        .dark-mode-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem 0.4rem;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
        }

        .hsapss-logout-btn {
          border-radius: 8px;
          padding: 0.52rem 0.9rem;
          font-weight: 600;
          background: #ffffff;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        .hsapss-logout-btn:hover {
          background: #fef2f2;
          border-color: #fca5a5;
          color: #991b1b;
        }

        @media (min-width: 992px) {
          .navbar-collapse {
            background: transparent;
            margin-top: 0;
            padding: 0;
            border: none;
          }
        }

        @media (max-width: 991px) {
          .navbar-collapse {
            padding: 1rem 0;
          }

          .hsapss-nav-utilities {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
            border-top: 1px solid rgba(148, 163, 184, 0.2);
            margin-top: 1rem;
            padding-top: 1rem;
          }

          .hsapss-nav-link {
            margin: 0.15rem 0;
          }
        }

      `}</style>
    </>
  );
};
export default Navigation;

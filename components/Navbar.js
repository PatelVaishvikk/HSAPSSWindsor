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
      { href: '/admin/dashboard', label: 'Dashboard', icon: 'fas fa-gauge-high' },
      { href: '/students-table', label: 'Yuvaks', icon: 'fas fa-users' },
      { href: '/moved-out-students', label: 'Moved Out', icon: 'fas fa-route' },
      { href: '/call-logs', label: 'Calls', icon: 'fas fa-phone-volume' },
      { href: '/attendance', label: 'Attendance', icon: 'fas fa-calendar-check' },
      { href: '/grocery', label: 'Grocery', icon: 'fas fa-basket-shopping' },
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
                  <span className="brand-subtitle">Youth Services Command Centre</span>
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

                <Badge bg="light" text="dark" className="analytics-pill">
                  <span className="pulse-dot" aria-hidden="true"></span>
                  <i className="fas fa-bolt me-2 text-warning"></i>
                  KPIs live
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
          padding: 0.75rem 0;
          background: linear-gradient(180deg, rgba(241, 245, 255, 0.92) 0%, rgba(241, 245, 255, 0.72) 60%, transparent);
          backdrop-filter: blur(18px);
        }

        .hsapss-navbar {
          border-radius: 1.5rem;
          padding: 0.65rem 0;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(28px);
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
          border: 1px solid rgba(148, 163, 184, 0.16);
        }

        .hsapss-brand {
          color: #1e293b !important;
          text-decoration: none;
        }

        .hsapss-brand:hover {
          color: #4338ca !important;
        }

        .brand-mark {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(129, 140, 248, 0.2), rgba(56, 189, 248, 0.24));
          box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.35);
        }

        .brand-logo {
          max-height: 32px;
          width: auto;
        }

        .brand-title {
          font-size: 1.15rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          line-height: 1;
        }

        .brand-subtitle {
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
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
          background: rgba(255, 255, 255, 0.96);
          border-radius: 1rem;
          margin-top: 0.75rem;
          padding: 1rem;
          border: 1px solid rgba(148, 163, 184, 0.12);
        }

        .hsapss-nav-link {
          padding: 0.55rem 1rem !important;
          margin: 0.2rem 0.35rem;
          border-radius: 0.85rem;
          font-weight: 600;
          color: #334155 !important;
          transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease;
          position: relative;
          overflow: hidden;
        }

        .hsapss-nav-link .nav-link-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.12);
          color: #4338ca;
          font-size: 0.85rem;
        }

        .hsapss-nav-link:hover,
        .hsapss-nav-link:focus {
          transform: translateY(-2px);
          background: rgba(129, 140, 248, 0.15);
          color: #1e1b4b !important;
        }

        .hsapss-nav-link.active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #f8fafc !important;
          box-shadow: 0 14px 30px rgba(99, 102, 241, 0.35);
        }

        .hsapss-nav-link.active .nav-link-icon {
          background: rgba(248, 250, 252, 0.2);
          color: #f8fafc;
        }

        .hsapss-nav-utilities {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-wrap: wrap;
        }

        .analytics-pill {
          border: 1px solid rgba(99, 102, 241, 0.25);
          background: rgba(240, 244, 255, 0.85) !important;
          color: #312e81;
          border-radius: 999px;
          padding: 0.4rem 0.85rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
        }

        .pulse-dot {
          width: 0.6rem;
          height: 0.6rem;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45);
          animation: pulse 2s infinite;
        }

        .dark-mode-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.3rem 0.45rem;
          border-radius: 0.75rem;
          background: rgba(241, 245, 255, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .hsapss-logout-btn {
          border-radius: 0.85rem;
          padding: 0.55rem 1rem;
          font-weight: 600;
          background: linear-gradient(135deg, #ef4444, #f97316);
          border: none;
          color: #ffffff;
        }

        .hsapss-logout-btn:hover {
          background: linear-gradient(135deg, #dc2626, #ea580c);
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

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }
      `}</style>
    </>
  );
};
export default Navigation;

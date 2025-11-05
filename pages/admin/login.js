import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Login failed');
      }
      const redirect =
        typeof router.query.redirect === 'string' ? router.query.redirect : '/admin/dashboard';
      router.replace(redirect);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Login - HSAPSS Windsor</title>
      </Head>
      <main className="admin-auth">
        <div className="admin-auth__background" />
        <div className="admin-auth__grid container px-4 px-lg-5">
          <Row className="align-items-center g-5">
            <Col lg={6}>
              <section className="admin-auth__hero">
                <span className="badge rounded-pill bg-white text-primary fw-semibold mb-3 px-3 py-2 shadow-sm">
                  <i className="fas fa-shield-alt me-2"></i>
                  HSAPSS Control Center
                </span>
                <h1 className="display-5 fw-bold text-white mb-3">
                  Lead the Windsor youth experience with confidence.
                </h1>
                <p className="lead text-white-50 mb-4">
                  Review student insights, broadcast updates, and keep operations running smoothly from one secure hub.
                </p>
                <div className="admin-auth__highlights">
                  {[
                    'Smart dashboards for calls, attendance, and sabha logistics.',
                    'Community pulse with real-time student updates.',
                    'Direct messaging and bulk outreach for coordinators.'
                  ].map((item) => (
                    <div key={item} className="admin-auth__highlight">
                      <div className="dot" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="d-flex flex-wrap align-items-center gap-3 mt-4">
                  <div className="d-flex align-items-center gap-2 text-white-50 small">
                    <i className="fas fa-lock"></i>
                    256-bit encryption on every login
                  </div>
                  <div className="d-flex align-items-center gap-2 text-white-50 small">
                    <i className="fas fa-headset"></i>
                    24/7 HSAPSS support line
                  </div>
                </div>
              </section>
            </Col>
            <Col lg={5} className="ms-lg-auto">
              <Card className="admin-auth__card border-0 shadow-lg">
                <Card.Body className="p-4 p-lg-5">
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <div>
                      <h2 className="h4 fw-bold mb-1">Administrator Sign-in</h2>
                      <p className="text-muted small mb-0">
                        Enter the shared credential to unlock the admin suite.
                      </p>
                    </div>
                    <span className="admin-auth__badge">
                      <i className="fas fa-fingerprint"></i>
                    </span>
                  </div>
                  {error && (
                    <Alert variant="danger" className="py-2">
                      {error}
                    </Alert>
                  )}
                  <Form onSubmit={handleSubmit} autoComplete="off">
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold small text-uppercase text-muted">
                        Admin Password
                      </Form.Label>
                      <Form.Control
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter secure key"
                        required
                        disabled={loading}
                        className="admin-auth__input"
                      />
                    </Form.Group>
                    <div className="d-grid gap-2">
                      <Button type="submit" className="admin-auth__submit" disabled={loading}>
                        {loading ? (
                          <>
                            <Spinner
                              animation="border"
                              size="sm"
                              className="me-2"
                              role="status"
                              aria-hidden="true"
                            />
                            Verifying Access...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-arrow-right me-2"></i>
                            Enter Console
                          </>
                        )}
                      </Button>
                      <Link href="/student-portal" passHref legacyBehavior>
                        <Button
                          as="a"
                          variant="link"
                          className="text-decoration-none text-muted fw-semibold"
                          disabled={loading}
                        >
                          <i className="fas fa-users me-2"></i>
                          Visit Student Portal
                        </Button>
                      </Link>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </main>
      <style jsx>{`
        .admin-auth {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: radial-gradient(circle at top left, #2563eb, transparent 45%),
            radial-gradient(circle at bottom right, #7c3aed, transparent 40%),
            linear-gradient(135deg, #0f172a 0%, #1f2937 100%);
          display: flex;
          align-items: center;
        }
        .admin-auth__background {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }
        .admin-auth__background::before,
        .admin-auth__background::after {
          content: '';
          position: absolute;
          width: 640px;
          height: 640px;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.3;
        }
        .admin-auth__background::before {
          top: -220px;
          left: -120px;
          background: #38bdf8;
        }
        .admin-auth__background::after {
          bottom: -260px;
          right: -160px;
          background: #a855f7;
        }
        .admin-auth__grid {
          position: relative;
          z-index: 1;
        }
        .admin-auth__hero {
          color: #e2e8f0;
        }
        .admin-auth__highlights {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .admin-auth__highlight {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(15, 23, 42, 0.35);
          border-radius: 1rem;
          backdrop-filter: blur(6px);
          font-weight: 500;
        }
        .admin-auth__highlight .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #38bdf8;
        }
        .admin-auth__card {
          border-radius: 1.5rem;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(18px);
        }
        .admin-auth__badge {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(147, 197, 253, 0.24));
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          font-size: 1.1rem;
        }
        .admin-auth__input {
          border-radius: 0.9rem;
          padding: 0.85rem 1rem;
          border: 1px solid rgba(15, 23, 42, 0.15);
          background: #f8fafc;
        }
        .admin-auth__input:focus {
          box-shadow: 0 0 0 0.25rem rgba(59, 130, 246, 0.25);
          border-color: rgba(59, 130, 246, 0.8);
        }
        .admin-auth__submit {
          border-radius: 0.9rem;
          padding: 0.85rem 1rem;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          border: none;
          font-weight: 600;
        }
        .admin-auth__submit:hover {
          background: linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%);
        }
        @media (max-width: 991px) {
          .admin-auth {
            padding: 4rem 0;
          }
          .admin-auth__hero {
            text-align: center;
          }
          .admin-auth__highlights {
            align-items: center;
          }
        }
      `}</style>
    </>
  );
}

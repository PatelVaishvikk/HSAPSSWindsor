import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import Link from 'next/link';
import styles from '../../styles/AdminLogin.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <main className={styles.page}>
        <section className={styles.panel} aria-label="Admin sign in">
          <div className={styles.brandRow}>
            <Link href="/" className={styles.brand}>
              <span className={styles.logo}>
                <img src="/windsor.jpg" alt="HSAPSS Windsor" />
              </span>
              <span>
                <span className={styles.brandTitle}>HSAPSS Windsor</span>
                <span className={styles.brandSubtitle}>Admin console</span>
              </span>
            </Link>
            <Link href="/student-portal" className={styles.portalLink}>
              Student portal
            </Link>
          </div>

          <div className={styles.header}>
            <p className={styles.eyebrow}>Restricted access</p>
            <h1>Sign in to admin</h1>
            <p>Use the administrator password configured for this local environment.</p>
          </div>

          {error && (
            <Alert variant="danger" className={styles.alert}>
              <i className="fas fa-triangle-exclamation" aria-hidden="true"></i>
              <span>{error}</span>
            </Alert>
          )}

          <Form onSubmit={handleSubmit} autoComplete="off" className={styles.form}>
            <Form.Group controlId="admin-password">
              <Form.Label>Admin password</Form.Label>
              <div className={styles.passwordField}>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  disabled={loading}
                  className={styles.input}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.visibilityToggle}
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={loading}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i>
                </button>
              </div>
            </Form.Group>

            <Button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" role="status" aria-hidden="true" />
                  <span>Verifying</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <i className="fas fa-arrow-right" aria-hidden="true"></i>
                </>
              )}
            </Button>
          </Form>

          <div className={styles.footerNote}>
            Admin sessions use HTTP-only cookies and expire automatically.
          </div>
        </section>
      </main>
    </>
  );
}

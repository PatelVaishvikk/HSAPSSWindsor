// pages/admin/dashboard.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Card, Table, Button } from 'react-bootstrap';
import Navbar from '../../components/Navbar';
import ChatBot from '../../components/ChatBot';
import Chart from 'chart.js/auto';

const DEFAULT_FRIDAY_REASONS = {
  Coming: 0,
  Job: 0,
  Lecture: 0,
  Other: 0
};

const createDefaultStudyInsights = () => ({
  byInstitution: [],
  topPrograms: [],
  postGradPlans: [],
  employmentStatus: [],
  residency: { active: 0, movedOut: 0 }
});

const normalizeStudyInsights = (insights) => {
  const defaults = createDefaultStudyInsights();
  if (!insights) {
    return defaults;
  }
  return {
    ...defaults,
    ...insights,
    residency: {
      ...defaults.residency,
      ...(insights.residency || {})
    }
  };
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCalls: 0,
    completedCalls: 0,
    pendingCalls: 0,
    todaysCalls: 0,
    weeksCalls: 0,
    monthsCalls: 0,
    fridayReasons: { ...DEFAULT_FRIDAY_REASONS },
    studyInsights: createDefaultStudyInsights()
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [activePanel, setActivePanel] = useState('calls');
  const [showChat, setShowChat] = useState(false);
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentCalls();
  }, []);

  useEffect(() => {
    if (activePanel !== 'calls') {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      return;
    }

    if (!chartRef.current) {
      return;
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: ['Today', 'This Week', 'This Month'],
        datasets: [
          {
            label: 'Call Volume',
            data: [
              Number(stats.todaysCalls || 0),
              Number(stats.weeksCalls || 0),
              Number(stats.monthsCalls || 0)
            ],
            backgroundColor: [
              'rgba(79, 70, 229, 0.85)',
              'rgba(13, 148, 136, 0.85)',
              'rgba(14, 116, 144, 0.85)'
            ],
            borderRadius: 12
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 13 } }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              font: { size: 13 }
            }
          }
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [activePanel, stats.todaysCalls, stats.weeksCalls, stats.monthsCalls]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard-stats');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dashboard statistics');
      }
      const incoming = data.stats || {};
      setStats({
        totalStudents: incoming.totalStudents ?? 0,
        totalCalls: incoming.totalCalls ?? 0,
        completedCalls: incoming.completedCalls ?? 0,
        pendingCalls: incoming.pendingCalls ?? 0,
        todaysCalls: incoming.todaysCalls ?? 0,
        weeksCalls: incoming.weeksCalls ?? 0,
        monthsCalls: incoming.monthsCalls ?? 0,
        fridayReasons: { ...DEFAULT_FRIDAY_REASONS, ...(incoming.fridayReasons || {}) },
        studyInsights: normalizeStudyInsights(incoming.studyInsights)
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentCalls = async () => {
    try {
      const response = await fetch('/api/call-logs?limit=5');
      if (response.ok) {
        const data = await response.json();
        const formattedCalls = data.callLogs.map((call) => ({
          student: call.student
            ? `${call.student.first_name} ${call.student.last_name}`
            : call.student_id
            ? `${call.student_id.first_name} ${call.student_id.last_name}`
            : 'Unknown Student',
          status: call.status || 'Pending',
          notes: call.notes || 'No notes',
          date: new Date(call.date).toLocaleString() || new Date().toLocaleString()
        }));
        setRecentCalls(formattedCalls);
      }
    } catch (err) {
      console.error('Error fetching recent calls:', err);
    }
  };

  const renderStatList = (items = [], emptyLabel = 'No data available') => {
    if (!items.length) {
      return <p className="text-muted small mb-0">{emptyLabel}</p>;
    }
    return (
      <ul className="list-group list-group-flush analytics-list">
        {items.map((item, index) => {
          const labelText = item.rank ? `${item.rank}. ${item.label}` : item.label;
          return (
            <li
              key={`${item.label}-${index}`}
              className="list-group-item d-flex justify-content-between align-items-center px-0"
            >
              <span className="fw-medium">{labelText}</span>
              <span className="badge bg-primary-subtle text-primary-emphasis rounded-pill px-3">
                {item.count}
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  const insights = stats.studyInsights || createDefaultStudyInsights();
  const callSummaryItems = [
    { label: 'Total calls logged', value: stats.totalCalls ?? 0 },
    { label: 'Completed calls', value: stats.completedCalls ?? 0 },
    { label: 'Pending / follow-ups', value: stats.pendingCalls ?? 0 },
    { label: 'Calls this week', value: stats.weeksCalls ?? 0 },
    { label: 'Calls today', value: stats.todaysCalls ?? 0 }
  ];

  return (
    <>
      <Head>
        <title>Admin Dashboard | HSAPSS Windsor</title>
      </Head>
      <Navbar />
      <div className="admin-dashboard-page container-fluid py-4">
        <div className="admin-dashboard-header mb-4">
          <div>
            <p className="admin-dashboard-eyebrow mb-1">Admin console</p>
            <h1 className="h3 mb-1 fw-bold">Operations Dashboard</h1>
            <p className="text-muted mb-0">
              Student records, call follow-ups, and weekly operating signals.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link href="/students-table" className="btn btn-outline-dark fw-semibold">
              Student Directory
            </Link>
            <Button
              variant="outline-secondary"
              onClick={() => setShowChat((prev) => !prev)}
              className="fw-semibold"
            >
              {showChat ? 'Hide Assistant' : 'Assistant'}
            </Button>
          </div>
        </div>
        {error && (
          <div className="alert alert-danger shadow-sm border-0" role="alert">
            {error}
          </div>
        )}

        <section className="row g-4 mb-4">
          {[
            { label: 'Students', value: stats.totalStudents, icon: 'fas fa-user-graduate', accent: '#6366f1' },
            { label: 'Total Calls', value: stats.totalCalls, icon: 'fas fa-phone-volume', accent: '#14b8a6' },
            { label: 'Completed', value: stats.completedCalls, icon: 'fas fa-check-circle', accent: '#22c55e' },
            { label: 'Pending', value: stats.pendingCalls, icon: 'fas fa-clock', accent: '#f97316' }
          ].map((item) => (
            <div className="col-12 col-sm-6 col-xl-3" key={item.label}>
              <Card className="metric-card border-0 shadow-sm">
                <Card.Body className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="metric-label mb-1">{item.label}</p>
                    <h2 className="metric-value mb-0">
                      {loading ? <span className="placeholder-glow">··</span> : item.value}
                    </h2>
                  </div>
                  <div className="metric-icon" style={{ background: `${item.accent}1a`, color: item.accent }}>
                    <i className={item.icon}></i>
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}
        </section>

        <section className="row g-4 mb-4">
          <div className="col-12 col-xl-7">
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4">
                <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center mb-3">
                  <h5 className="fw-semibold mb-0">Engagement Overview</h5>
                  <div className="btn-group btn-group-sm">
                    <Button
                      variant={activePanel === 'calls' ? 'primary' : 'outline-primary'}
                      onClick={() => setActivePanel('calls')}
                    >
                      Call Activity
                    </Button>
                    <Button
                      variant={activePanel === 'students' ? 'primary' : 'outline-primary'}
                      onClick={() => setActivePanel('students')}
                    >
                      Student Trends
                    </Button>
                  </div>
                </div>
                {activePanel === 'calls' ? (
                  <div>
                    <div className="chart-wrapper p-3 rounded-4 mb-4">
                      <canvas ref={chartRef} height={220} />
                    </div>
                    <div className="row g-3">
                      {callSummaryItems.map((item) => (
                        <div className="col-6" key={item.label}>
                          <div className="call-summary-chip">
                            <span className="chip-label">{item.label}</span>
                            <span className="chip-value">{loading ? '··' : item.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="row g-3">
                    <div className="col-12">
                      <h6 className="fw-semibold mb-2">Top Institutions</h6>
                      {renderStatList(insights.byInstitution, 'No institution data')}
                    </div>
                    <div className="col-12 col-lg-6">
                      <h6 className="fw-semibold mb-2">Popular Programs</h6>
                      {renderStatList(insights.topPrograms, 'No program data')}
                    </div>
                    <div className="col-12 col-lg-6">
                      <h6 className="fw-semibold mb-2">Post Grad Plans</h6>
                      {renderStatList(insights.postGradPlans, 'No post-grad data')}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
          <div className="col-12 col-xl-5">
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="fw-semibold mb-1">Friday Reason Pulse</h5>
                    <small className="text-muted">
                      How last Friday&apos;s check-ins were categorized.
                    </small>
                  </div>
                  <Link href="/call-logs" className="btn btn-outline-primary btn-sm">
                    Manage Calls
                  </Link>
                </div>
                <Table borderless responsive className="mb-0 friday-table">
                  <tbody>
                    {Object.entries(stats.fridayReasons || DEFAULT_FRIDAY_REASONS).map(
                      ([reason, value]) => (
                        <tr key={reason}>
                          <td className="text-muted">{reason}</td>
                          <td className="text-end fw-semibold">{loading ? '··' : value}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </Table>
                <div className="mt-4">
                  <h6 className="fw-semibold mb-2">Residency Snapshot</h6>
                  <div className="d-flex gap-3">
                    <div className="residency-pill bg-primary-subtle text-primary-emphasis">
                      Active: {stats.studyInsights.residency?.active ?? 0}
                    </div>
                    <div className="residency-pill bg-warning-subtle text-warning-emphasis">
                      Moved Out: {stats.studyInsights.residency?.movedOut ?? 0}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        </section>

        <section className="row g-4">
          <div className="col-12 col-xl-6">
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-0">
                <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom">
                  <h5 className="fw-semibold mb-0">Recent Call Notes</h5>
                  <Link href="/call-logs" className="btn btn-sm btn-primary">
                    View All
                  </Link>
                </div>
                <Table responsive hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Status</th>
                      <th>Notes</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCalls.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          No recent calls logged.
                        </td>
                      </tr>
                    ) : (
                      recentCalls.map((call, index) => (
                        <tr key={`${call.student}-${index}`}>
                          <td>{call.student}</td>
                          <td>
                            <span className="badge bg-primary-subtle text-primary-emphasis">
                              {call.status}
                            </span>
                          </td>
                          <td style={{ maxWidth: 220 }}>
                            <span className="d-inline-block text-truncate" style={{ maxWidth: '200px' }}>
                              {call.notes}
                            </span>
                          </td>
                          <td className="text-muted small">{call.date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </div>
          <div className="col-12 col-xl-6">
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="fw-semibold mb-1">Operational Shortcuts</h5>
                    <small className="text-muted">Quick links for your most common tasks.</small>
                  </div>
                  <Button
                    as={Link}
                    href="/students-table"
                    variant="outline-primary"
                    size="sm"
                    className="fw-semibold"
                  >
                    Full Directory
                  </Button>
                </div>
                <div className="row g-3">
                  {[
                    {
                      title: 'Add New Student',
                      description: 'Register new yuvaks and capture their contact info.',
                      href: '/add-yuvak',
                      icon: 'fas fa-user-plus'
                    },
                    {
                      title: 'Attendance Sheet',
                      description: 'Review participation and fill in missing check-ins.',
                      href: '/attendance',
                      icon: 'fas fa-clipboard-check'
                    },
                    {
                      title: 'Grocery Planner',
                      description: 'Track sabha groceries and weekly essentials.',
                      href: '/grocery',
                      icon: 'fas fa-carrot'
                    }
                  ].map((shortcut) => (
                    <div className="col-12" key={shortcut.title}>
                      <Link href={shortcut.href} className="shortcut-card">
                        <div className="shortcut-icon">
                          <i className={shortcut.icon}></i>
                        </div>
                        <div>
                          <h6 className="fw-semibold mb-1">{shortcut.title}</h6>
                          <p className="text-muted small mb-0">{shortcut.description}</p>
                        </div>
                        <i className="fas fa-arrow-right ms-auto text-primary"></i>
                      </Link>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </div>
        </section>
      </div>
      {showChat && (
        <div className="chat-widget">
          <ChatBot />
        </div>
      )}
      <style jsx>{`
        .chat-widget {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: min(360px, 90%);
          z-index: 1040;
        }
      `}</style>
      <style jsx global>{`
        .admin-dashboard-page {
          color: #111827;
          background: #f8fafc;
          min-height: calc(100vh - 72px);
        }
        .admin-dashboard-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .admin-dashboard-eyebrow {
          color: #b45309;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0;
          text-transform: uppercase;
        }
        .admin-dashboard-page .card {
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          box-shadow: none !important;
          background: #ffffff;
        }
        .admin-dashboard-page .btn {
          border-radius: 8px;
        }
        .metric-card {
          background: #ffffff;
        }
        .metric-label {
          font-size: 0.85rem;
          letter-spacing: 0;
          text-transform: none;
          color: #64748b;
        }
        .metric-value {
          font-size: 2rem;
          font-weight: 760;
          color: #111827;
        }
        .metric-icon {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        .chart-wrapper {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .call-summary-chip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #ffffff;
        }
        .chip-label {
          color: #475569;
          font-weight: 500;
          font-size: 0.85rem;
        }
        .chip-value {
          font-weight: 700;
          color: #0f172a;
        }
        .friday-table td {
          padding: 0.6rem 0;
        }
        .residency-pill {
          border-radius: 8px;
          padding: 0.4rem 0.95rem;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .shortcut-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.15rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #ffffff;
          text-decoration: none;
          transition: border-color 0.15s ease, background 0.15s ease;
          color: inherit;
        }
        .shortcut-card:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: inherit;
        }
        .shortcut-icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          background: #f1f5f9;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #334155;
          font-size: 1.1rem;
        }
        @media (max-width: 991px) {
          .shortcut-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .shortcut-card i.fas.fa-arrow-right {
            margin-left: 0;
          }
          .admin-dashboard-header {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}

export async function getServerSideProps(ctx) {
  const { requireAdminPage } = await import('../../lib/adminPage.js');
  return requireAdminPage(ctx);
}

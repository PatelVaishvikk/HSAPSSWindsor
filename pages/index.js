// pages/index.js
import { useState, useEffect, useRef } from 'react';
import { Card, Table, Button } from 'react-bootstrap';
import Navbar from '../components/Navbar';
import Head from 'next/head';
import Link from 'next/link';
import ChatBot from '../components/ChatBot'; // Import your ChatBot component

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

export default function Dashboard() {
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
  
  // State to toggle chatbot visibility
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

    if (typeof window === 'undefined' || !window.Chart || !chartRef.current) {
      return;
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new window.Chart(chartRef.current, {
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
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentCalls = async () => {
    try {
      const response = await fetch('/api/call-logs?limit=5');
      if (response.ok) {
        const data = await response.json();
        // Transform the data to ensure we're using the correct properties
        const formattedCalls = data.callLogs.map(call => ({
          student: call.student ? `${call.student.first_name} ${call.student.last_name}` :
          call.student_id ? `${call.student_id.first_name} ${call.student_id.last_name}` : 
          'Unknown Student',
          status: call.status || 'Pending',
          notes: call.notes || 'No notes',
          date: new Date(call.date).toLocaleString() || new Date().toLocaleString()
        }));
        setRecentCalls(formattedCalls);
      }
    } catch (error) {
      console.error('Error fetching recent calls:', error);
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
        <title>Dashboard - HSAPSS Windsor</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <Navbar />
      <div className="container-fluid py-4" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h3 mb-0 fw-bold" style={{ letterSpacing: '0.5px' }}>Dashboard</h1>
          {/* Chat toggle button */}
          <Button variant="info" onClick={() => setShowChat((prev) => !prev)} style={{ fontWeight: 600 }}>
            {showChat ? 'Hide Chat' : 'Chat with AI'}
          </Button>
        </div>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <div className="row g-4 mb-4">
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="stat-card h-100 p-4 d-flex flex-column justify-content-between align-items-start"
              style={{
                background: 'linear-gradient(135deg, #17a2b8 0%, #48c6ef 100%)',
                color: 'white',
                borderRadius: '1.25rem',
                boxShadow: '0 4px 24px rgba(23,162,184,0.12)',
                transition: 'transform 0.18s cubic-bezier(.4,2,.6,1), box-shadow 0.18s',
                cursor: 'pointer',
                minHeight: '140px',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div className="d-flex align-items-center mb-2">
                <i className="fas fa-users fa-3x me-3" style={{ opacity: 0.85 }}></i>
                <div>
                  <div className="display-6 fw-bold" style={{ fontSize: '2.2rem', lineHeight: 1 }}>{loading ? <span className="spinner-border spinner-border-sm" /> : stats.totalStudents}</div>
                  <div className="text-uppercase small mt-1" style={{ letterSpacing: '1px', fontWeight: 600 }}>Total Students</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-success h-100 py-2" style={{ backgroundColor: '#ffc107', color: 'white' }}>
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="h5 mb-0 font-weight-bold">
                      {loading ? (
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      ) : (
                        stats.totalCalls
                      )}
                    </div>
                    <div className="text-uppercase">Total Calls</div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-phone fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-info h-100 py-2" style={{ backgroundColor: '#28a745', color: 'white' }}>
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="h5 mb-0 font-weight-bold">
                      {loading ? (
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      ) : (
                        stats.completedCalls
                      )}
                    </div>
                    <div className="text-uppercase">Completed Calls</div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-check-circle fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-warning h-100 py-2" style={{ backgroundColor: '#dc3545', color: 'white' }}>
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="h5 mb-0 font-weight-bold">
                      {loading ? (
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      ) : (
                        stats.pendingCalls
                      )}
                    </div>
                    <div className="text-uppercase">Pending Calls</div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-clock fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-info h-100 py-2" style={{ backgroundColor: '#007bff', color: 'white' }}>
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="h5 mb-0 font-weight-bold">
                      {loading ? (
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      ) : (
                        stats.todaysCalls
                      )}
                    </div>
                    <div className="text-uppercase">Today's Calls</div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-calendar-day fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-info h-100 py-2" style={{ backgroundColor: '#6610f2', color: 'white' }}>
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="h5 mb-0 font-weight-bold">
                      {loading ? (
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      ) : (
                        stats.weeksCalls
                      )}
                    </div>
                    <div className="text-uppercase">This Week's Calls</div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-calendar-week fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-info h-100 py-2" style={{ backgroundColor: '#fd7e14', color: 'white' }}>
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="h5 mb-0 font-weight-bold">
                      {loading ? (
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      ) : (
                        stats.monthsCalls
                      )}
                    </div>
                    <div className="text-uppercase">This Month's Calls</div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-calendar-alt fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '1.25rem', background: 'white' }}>
          <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">
            <h4 className="mb-0 text-uppercase small fw-semibold text-muted">Insights Overview</h4>
            <div className="btn-group insights-toggle">
              <Button
                variant={activePanel === 'calls' ? 'primary' : 'outline-primary'}
                className="px-4"
                onClick={() => setActivePanel('calls')}
              >
                Call Analytics
              </Button>
              <Button
                variant={activePanel === 'students' ? 'primary' : 'outline-primary'}
                className="px-4"
                onClick={() => setActivePanel('students')}
              >
                Yuvak Analytics
              </Button>
            </div>
          </div>
        </div>

        {activePanel === 'calls' && (
          <>
            <div className="row g-4 mb-4">
              <div className="col-xl-6 col-lg-6">
                <div className="card shadow-lg p-4 analytics-card h-100" style={{ borderRadius: '1.25rem', background: 'white', boxShadow: '0 4px 24px rgba(34,34,59,0.08)' }}>
                  <h4 className="fw-bold mb-2" style={{ letterSpacing: '0.5px', fontSize: '1.4rem', color: '#22223b' }}>
                    Call Volume Snapshot
                  </h4>
                  <p className="text-muted small mb-3">Activity captured for today, this week, and this month.</p>
                  <div className="chart-wrapper">
                    <canvas ref={chartRef} height="220" />
                  </div>
                </div>
              </div>
              <div className="col-xl-6 col-lg-6">
                <div className="card shadow-lg p-4 analytics-card h-100" style={{ borderRadius: '1.25rem', background: 'white', boxShadow: '0 4px 24px rgba(34,34,59,0.08)' }}>
                  <h4 className="fw-bold mb-3" style={{ letterSpacing: '0.5px', fontSize: '1.4rem', color: '#22223b' }}>
                    Follow-up Summary
                  </h4>
                  <ul className="list-group list-group-flush analytics-list">
                    {callSummaryItems.map((item) => (
                      <li key={item.label} className="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span className="fw-medium">{item.label}</span>
                        <span className="badge bg-primary-subtle text-primary-emphasis rounded-pill px-3">
                          {item.value ?? 0}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-12">
                <div className="card shadow-lg p-4" style={{ borderRadius: '1.25rem', background: 'white', boxShadow: '0 4px 24px rgba(34,34,59,0.08)' }}>
                  <h4 className="fw-bold mb-3" style={{ letterSpacing: '0.5px', fontSize: '1.5rem', color: '#22223b' }}>
                    Friday Call Status
                  </h4>
                  <div className="d-flex flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-success" style={{ fontSize: '1rem', padding: '0.5em 1em', borderRadius: '0.75rem' }}>Coming</span>
                      <span className="fw-bold" style={{ fontSize: '1.2rem' }}>{stats.fridayReasons?.Coming ?? 0}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-info" style={{ fontSize: '1rem', padding: '0.5em 1em', borderRadius: '0.75rem' }}>Job</span>
                      <span className="fw-bold" style={{ fontSize: '1.2rem' }}>{stats.fridayReasons?.Job ?? 0}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-warning text-dark" style={{ fontSize: '1rem', padding: '0.5em 1em', borderRadius: '0.75rem' }}>Lecture</span>
                      <span className="fw-bold" style={{ fontSize: '1.2rem' }}>{stats.fridayReasons?.Lecture ?? 0}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-secondary" style={{ fontSize: '1rem', padding: '0.5em 1em', borderRadius: '0.75rem' }}>Other</span>
                      <span className="fw-bold" style={{ fontSize: '1.2rem' }}>{stats.fridayReasons?.Other ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row mt-4">
              <div className="col-12">
                <div className="card shadow-lg p-4" style={{ borderRadius: '1.25rem', background: 'white', boxShadow: '0 4px 24px rgba(34,34,59,0.08)' }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="fw-bold mb-0" style={{ letterSpacing: '0.5px', fontSize: '1.5rem', color: '#22223b' }}>Recent Call Logs</h4>
                    <Link href="/call-logs" className="btn btn-primary btn-sm" style={{ fontWeight: 600, borderRadius: '0.75rem' }}>
                      View All
                    </Link>
                  </div>
                  <div className="table-responsive">
                    <Table hover responsive className="mb-0" style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.05rem' }}>
                      <thead style={{ background: 'linear-gradient(90deg, #e0e7ef 0%, #f8fafc 100%)', fontWeight: 700, fontSize: '1rem', color: '#22223b' }}>
                        <tr>
                          <th>Student</th>
                          <th>Status</th>
                          <th>Notes</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentCalls.length > 0 ? (
                          recentCalls.map((call, index) => (
                            <tr key={index} style={{ transition: 'background 0.18s' }}>
                              <td className="fw-semibold">{call.student}</td>
                              <td>
                                <span className={`badge bg-${call.status === 'Completed' ? 'success' : 'warning'}`} style={{ fontSize: '1rem', padding: '0.5em 1em', borderRadius: '0.75rem' }}>
                                  {call.status}
                                </span>
                              </td>
                              <td style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{call.notes}</td>
                              <td className="text-muted">{call.date}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="text-center py-4">
                              No recent calls found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activePanel === 'students' && (
          <div className="row g-4 mb-4">
            <div className="col-xl-4 col-md-6">
              <div className="card shadow-lg p-4 analytics-card h-100" style={{ borderRadius: '1.25rem', background: 'white', boxShadow: '0 4px 24px rgba(34,34,59,0.08)' }}>
                <h4 className="fw-bold mb-3" style={{ letterSpacing: '0.5px', fontSize: '1.4rem', color: '#22223b' }}>
                  Study Institutions
                </h4>
                {renderStatList(insights.byInstitution, 'No institution data available')}
              </div>
            </div>
            <div className="col-xl-4 col-md-6">
              <div className="card shadow-lg p-4 analytics-card h-100" style={{ borderRadius: '1.25rem', background: 'white', boxShadow: '0 4px 24px rgba(34,34,59,0.08)' }}>
                <h4 className="fw-bold mb-3" style={{ letterSpacing: '0.5px', fontSize: '1.4rem', color: '#22223b' }}>
                  Top Study Programs
                </h4>
                {renderStatList(insights.topPrograms, 'No program data available')}
              </div>
            </div>
            <div className="col-xl-4 col-md-12">
              <div className="card shadow-lg p-4 analytics-card h-100" style={{ borderRadius: '1.25rem', background: 'white', boxShadow: '0 4px 24px rgba(34,34,59,0.08)' }}>
                <h4 className="fw-bold mb-3" style={{ letterSpacing: '0.5px', fontSize: '1.4rem', color: '#22223b' }}>
                  Career & Residency
                </h4>
                <div className="row">
                  <div className="col-12 col-md-6">
                    <h6 className="text-uppercase text-muted small fw-semibold mb-2">Post-graduation Plans</h6>
                    {renderStatList(insights.postGradPlans, 'No post-graduation data')}
                  </div>
                  <div className="col-12 col-md-6 mt-3 mt-md-0">
                    <h6 className="text-uppercase text-muted small fw-semibold mb-2">Employment Status</h6>
                    {renderStatList(insights.employmentStatus, 'No employment data')}
                  </div>
                </div>
                <div className="mt-4">
                  <h6 className="text-uppercase text-muted small fw-semibold mb-3">Residency</h6>
                  <div className="d-flex flex-wrap gap-2">
                    <span className="badge bg-success-subtle text-success-emphasis px-3 py-2 rounded-pill">
                      Active in Windsor: <strong>{insights.residency?.active ?? 0}</strong>
                    </span>
                    <span className="badge bg-danger-subtle text-danger-emphasis px-3 py-2 rounded-pill">
                      Moved Out: <strong>{insights.residency?.movedOut ?? 0}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Chatbot Display */}
        {showChat && (
          <div className="mt-4">
            <ChatBot />
          </div>
        )}
      </div>
      <style jsx global>{`
        body, .container-fluid { font-family: 'Inter', sans-serif; }
        .stat-card:hover { box-shadow: 0 8px 32px rgba(23,162,184,0.18) !important; }
        .stat-card { transition: box-shadow 0.18s, transform 0.18s; }
        .display-6 { font-size: 2.2rem; font-weight: 700; }
        .card .table-hover tbody tr:hover {
          background: #e0e7ef !important;
          transition: background 0.18s;
        }
        .analytics-card .analytics-list .list-group-item {
          background: transparent;
          border: none;
          padding-left: 0;
          padding-right: 0;
        }
        .analytics-card .analytics-list .list-group-item + .list-group-item {
          border-top: 1px solid rgba(34,34,59,0.08);
        }
        .analytics-card .badge {
          font-size: 0.85rem;
        }
        .insights-toggle .btn {
          border-radius: 999px;
          min-width: 160px;
          font-weight: 600;
        }
        .insights-toggle .btn + .btn {
          margin-left: 0.75rem;
        }
        .chart-wrapper {
          position: relative;
          min-height: 220px;
        }
      `}</style>
    </>
  );
}

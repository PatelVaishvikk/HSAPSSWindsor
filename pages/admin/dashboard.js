import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Alert, Badge, Button, Spinner, Table } from 'react-bootstrap';
import Navbar from '../../components/Navbar';

const DEFAULT_FRIDAY_REASONS = {
  Coming: 0,
  Job: 0,
  Lecture: 0,
  Other: 0
};

const DEFAULT_STATS = {
  totalStudents: 0,
  totalCalls: 0,
  completedCalls: 0,
  pendingCalls: 0,
  todaysCalls: 0,
  weeksCalls: 0,
  monthsCalls: 0,
  fridayReasons: { ...DEFAULT_FRIDAY_REASONS },
  studyInsights: {
    byInstitution: [],
    topPrograms: [],
    postGradPlans: [],
    employmentStatus: [],
    residency: { active: 0, movedOut: 0 }
  }
};

const DEFAULT_DETAILS_STATS = {
  total: 0,
  formUpdates: 0,
  completeAddress: 0,
  missingAddress: 0,
  missingBirthdate: 0
};

const STATUS_BADGES = {
  Completed: 'success',
  Dialed: 'primary',
  'No Answer': 'warning',
  'Left Message': 'info',
  Rescheduled: 'secondary',
  Pending: 'warning'
};

const normalizeStudyInsights = (insights = {}) => ({
  ...DEFAULT_STATS.studyInsights,
  ...insights,
  residency: {
    ...DEFAULT_STATS.studyInsights.residency,
    ...(insights.residency || {})
  }
});

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const safeList = (value) => (Array.isArray(value) ? value : []);

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Failed to load ${url}`);
  }
  return data;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [detailsStats, setDetailsStats] = useState(DEFAULT_DETAILS_STATS);
  const [callSummary, setCallSummary] = useState({ followUps: { total: 0, overdue: 0 }, lastActivity: null });
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    const [statsResult, callsResult, detailsResult] = await Promise.allSettled([
      fetchJson('/api/dashboard-stats'),
      fetchJson('/api/call-logs?limit=6'),
      fetchJson('/api/yuvak-details-dashboard')
    ]);

    const failures = [];

    if (statsResult.status === 'fulfilled') {
      const incoming = statsResult.value.stats || {};
      setStats({
        ...DEFAULT_STATS,
        ...incoming,
        fridayReasons: { ...DEFAULT_FRIDAY_REASONS, ...(incoming.fridayReasons || {}) },
        studyInsights: normalizeStudyInsights(incoming.studyInsights)
      });
    } else {
      failures.push(statsResult.reason.message || 'Dashboard statistics failed.');
    }

    if (callsResult.status === 'fulfilled') {
      const callData = callsResult.value || {};
      setRecentCalls(safeList(callData.callLogs));
      setCallSummary({
        followUps: {
          total: callData.summary?.followUps?.total || 0,
          overdue: callData.summary?.followUps?.overdue || 0
        },
        lastActivity: callData.summary?.lastActivity || null
      });
    } else {
      failures.push(callsResult.reason.message || 'Recent call notes failed.');
    }

    if (detailsResult.status === 'fulfilled') {
      setDetailsStats({ ...DEFAULT_DETAILS_STATS, ...(detailsResult.value.stats || {}) });
    } else {
      failures.push(detailsResult.reason.message || 'Yuvak detail quality failed.');
    }

    if (failures.length) {
      setError(failures.join(' '));
    }
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const insights = stats.studyInsights || DEFAULT_STATS.studyInsights;
  const completionRate = stats.totalCalls > 0
    ? Math.round((Number(stats.completedCalls || 0) / Number(stats.totalCalls || 1)) * 100)
    : 0;
  const activeCount = insights.residency?.active || 0;
  const movedOutCount = insights.residency?.movedOut || 0;
  const dataCompletionRate = detailsStats.total > 0
    ? Math.round((Number(detailsStats.completeAddress || 0) / Number(detailsStats.total || 1)) * 100)
    : 0;
  const callVolumeMax = Math.max(stats.todaysCalls || 0, stats.weeksCalls || 0, stats.monthsCalls || 0, 1);

  const attentionItems = useMemo(() => [
    {
      label: 'Open follow-ups',
      value: callSummary.followUps.total,
      tone: callSummary.followUps.total > 0 ? 'amber' : 'green',
      href: '/call-logs',
      icon: 'fas fa-phone-volume'
    },
    {
      label: 'Overdue follow-ups',
      value: callSummary.followUps.overdue,
      tone: callSummary.followUps.overdue > 0 ? 'red' : 'green',
      href: '/call-logs',
      icon: 'fas fa-clock'
    },
    {
      label: 'Missing addresses',
      value: detailsStats.missingAddress,
      tone: detailsStats.missingAddress > 0 ? 'amber' : 'green',
      href: '/yuvak-details-dashboard',
      icon: 'fas fa-map-marker-alt'
    },
    {
      label: 'Missing birthdates',
      value: detailsStats.missingBirthdate,
      tone: detailsStats.missingBirthdate > 0 ? 'amber' : 'green',
      href: '/yuvak-details-dashboard',
      icon: 'fas fa-calendar-day'
    }
  ], [callSummary.followUps.overdue, callSummary.followUps.total, detailsStats.missingAddress, detailsStats.missingBirthdate]);

  const metricCards = [
    {
      label: 'Yuvak records',
      value: stats.totalStudents,
      detail: `${formatNumber(activeCount)} active, ${formatNumber(movedOutCount)} moved`,
      icon: 'fas fa-users',
      tone: 'ink'
    },
    {
      label: 'Calls logged',
      value: stats.totalCalls,
      detail: `${completionRate}% completion rate`,
      icon: 'fas fa-phone',
      tone: 'blue'
    },
    {
      label: 'Pending work',
      value: stats.pendingCalls,
      detail: `${formatNumber(callSummary.followUps.overdue)} overdue follow-ups`,
      icon: 'fas fa-tasks',
      tone: 'amber'
    },
    {
      label: 'Public updates',
      value: detailsStats.formUpdates,
      detail: `${dataCompletionRate}% address completeness`,
      icon: 'fas fa-address-card',
      tone: 'green'
    }
  ];

  const callBars = [
    { label: 'Today', value: stats.todaysCalls || 0 },
    { label: 'This week', value: stats.weeksCalls || 0 },
    { label: 'This month', value: stats.monthsCalls || 0 }
  ];

  const shortcuts = [
    {
      title: 'Yuvak Details',
      description: 'Review birthdates, addresses, cities, and mandals.',
      href: '/yuvak-details-dashboard',
      icon: 'fas fa-address-card'
    },
    {
      title: 'Student Directory',
      description: 'Search, edit, and manage full yuvak profiles.',
      href: '/students-table',
      icon: 'fas fa-users'
    },
    {
      title: 'Locations',
      description: 'Track current mandal and moved-out status.',
      href: '/moved-out-students',
      icon: 'fas fa-map-marker-alt'
    },
    {
      title: 'Attendance',
      description: 'Record sabha attendance and participation.',
      href: '/attendance',
      icon: 'fas fa-calendar-check'
    },
    {
      title: 'Call Logs',
      description: 'Manage outreach, notes, and follow-ups.',
      href: '/call-logs',
      icon: 'fas fa-phone-volume'
    },
    {
      title: 'Add Yuvak',
      description: 'Create a new profile with contact details.',
      href: '/add-yuvak',
      icon: 'fas fa-user-plus'
    }
  ];

  const renderRankList = (items, emptyLabel) => {
    const visibleItems = safeList(items).filter((item) => item.label).slice(0, 5);
    if (visibleItems.length === 0) {
      return <div className="empty-inline">{emptyLabel}</div>;
    }
    return (
      <div className="rank-list">
        {visibleItems.map((item, index) => (
          <div className="rank-row" key={`${item.label}-${index}`}>
            <span>{item.label}</span>
            <strong>{formatNumber(item.count)}</strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Admin Dashboard | HSAPSS Windsor</title>
      </Head>
      <Navbar />

      <main className="admin-page">
        <div className="admin-shell">
          <header className="admin-header">
            <div>
              <p className="eyebrow">Admin console</p>
              <h1>Operations Dashboard</h1>
              <p className="header-copy">
                A focused view of yuvak records, outreach health, and data quality.
              </p>
            </div>
            <div className="header-actions">
              <Link href="/yuvak-details-dashboard" className="btn btn-dark">
                <i className="fas fa-address-card" aria-hidden="true"></i>
                Details
              </Link>
              <Link href="/students-table" className="btn btn-outline-dark">
                <i className="fas fa-users" aria-hidden="true"></i>
                Directory
              </Link>
              <Button
                variant="outline-secondary"
                onClick={() => loadDashboard({ silent: true })}
                disabled={loading || refreshing}
              >
                {refreshing ? (
                  <Spinner animation="border" size="sm" aria-hidden="true" />
                ) : (
                  <i className="fas fa-sync-alt" aria-hidden="true"></i>
                )}
                Refresh
              </Button>
            </div>
          </header>

          <section className="status-strip" aria-live="polite">
            <div>
              <span className={`status-dot ${error ? 'warning' : 'ready'}`}></span>
              {error ? 'Some dashboard sections need attention' : 'Production data connected'}
            </div>
            <span>Last updated: {lastUpdated ? formatDateTime(lastUpdated) : 'Loading'}</span>
          </section>

          {error && (
            <Alert variant="warning" className="dashboard-alert">
              <div>
                <strong>Dashboard loaded with partial data.</strong>
                <p>{error}</p>
              </div>
              <Button variant="outline-dark" size="sm" onClick={() => loadDashboard({ silent: true })}>
                Retry
              </Button>
            </Alert>
          )}

          <section className="metric-grid">
            {metricCards.map((metric) => (
              <article className={`metric-card ${metric.tone}`} key={metric.label}>
                <div>
                  <p>{metric.label}</p>
                  <h2>{loading ? '...' : formatNumber(metric.value)}</h2>
                  <span>{loading ? 'Loading' : metric.detail}</span>
                </div>
                <span className="metric-icon">
                  <i className={metric.icon} aria-hidden="true"></i>
                </span>
              </article>
            ))}
          </section>

          <section className="dashboard-grid">
            <div className="panel panel-large">
              <div className="panel-header">
                <div>
                  <h2>Attention Queue</h2>
                  <p>Items that are most likely to need admin follow-up.</p>
                </div>
                <Badge bg={attentionItems.some((item) => Number(item.value) > 0) ? 'warning' : 'success'} text="dark">
                  {attentionItems.reduce((sum, item) => sum + Number(item.value || 0), 0)} open
                </Badge>
              </div>
              <div className="attention-grid">
                {attentionItems.map((item) => (
                  <Link href={item.href} className={`attention-card ${item.tone}`} key={item.label}>
                    <span>
                      <i className={item.icon} aria-hidden="true"></i>
                    </span>
                    <div>
                      <strong>{loading ? '...' : formatNumber(item.value)}</strong>
                      <p>{item.label}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Call Volume</h2>
                  <p>Recent outreach activity by period.</p>
                </div>
              </div>
              <div className="bar-list">
                {callBars.map((item) => (
                  <div className="bar-row" key={item.label}>
                    <div>
                      <span>{item.label}</span>
                      <strong>{loading ? '...' : formatNumber(item.value)}</strong>
                    </div>
                    <div className="bar-track">
                      <span style={{ width: `${Math.max(6, (Number(item.value || 0) / callVolumeMax) * 100)}%` }}></span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="last-activity">
                Last call activity: <strong>{formatDateTime(callSummary.lastActivity)}</strong>
              </div>
            </div>
          </section>

          <section className="dashboard-grid">
            <div className="panel panel-large">
              <div className="panel-header">
                <div>
                  <h2>Recent Call Notes</h2>
                  <p>The latest outreach notes across the yuvak directory.</p>
                </div>
                <Link href="/call-logs" className="panel-link">View all</Link>
              </div>
              <div className="table-responsive">
                <Table hover className="ops-table">
                  <thead>
                    <tr>
                      <th>Yuvak</th>
                      <th>Status</th>
                      <th>Notes</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="empty-table">Loading recent calls...</td>
                      </tr>
                    ) : recentCalls.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="empty-table">No recent call notes found.</td>
                      </tr>
                    ) : (
                      recentCalls.map((call) => {
                        const student = call.student || {};
                        const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Unknown yuvak';
                        const status = call.status || 'Pending';
                        return (
                          <tr key={call._id || `${name}-${call.timestamp || call.date}`}>
                            <td>
                              <strong>{name}</strong>
                              <span>{student.phone || student.mail_id || 'No contact saved'}</span>
                            </td>
                            <td>
                              <Badge bg={STATUS_BADGES[status] || 'secondary'}>{status}</Badge>
                            </td>
                            <td className="notes-cell">{call.notes || 'No notes recorded'}</td>
                            <td className="time-cell">{formatDateTime(call.timestamp || call.date)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Yuvak Data Quality</h2>
                  <p>Completeness from the public details form.</p>
                </div>
                <Link href="/yuvak-details-dashboard" className="panel-link">Open</Link>
              </div>
              <div className="quality-stack">
                <QualityRow label="Complete addresses" value={detailsStats.completeAddress} total={detailsStats.total} tone="green" />
                <QualityRow label="Missing addresses" value={detailsStats.missingAddress} total={detailsStats.total} tone="amber" />
                <QualityRow label="Missing birthdates" value={detailsStats.missingBirthdate} total={detailsStats.total} tone="red" />
              </div>
            </div>
          </section>

          <section className="dashboard-grid">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Study Snapshot</h2>
                  <p>Education and post-graduation signals.</p>
                </div>
              </div>
              <div className="insight-columns">
                <div>
                  <h3>Top institutions</h3>
                  {renderRankList(insights.byInstitution, 'No institution data yet.')}
                </div>
                <div>
                  <h3>Programs</h3>
                  {renderRankList(insights.topPrograms, 'No program data yet.')}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Friday Check-ins</h2>
                  <p>Last Friday call reasons by category.</p>
                </div>
              </div>
              <div className="reason-grid">
                {Object.entries(stats.fridayReasons || DEFAULT_FRIDAY_REASONS).map(([reason, value]) => (
                  <div className="reason-tile" key={reason}>
                    <span>{reason}</span>
                    <strong>{loading ? '...' : formatNumber(value)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Admin Workflows</h2>
                <p>Direct paths to the operational pages used every week.</p>
              </div>
            </div>
            <div className="shortcut-grid">
              {shortcuts.map((shortcut) => (
                <Link href={shortcut.href} className="shortcut-card" key={shortcut.href}>
                  <span className="shortcut-icon">
                    <i className={shortcut.icon} aria-hidden="true"></i>
                  </span>
                  <div>
                    <strong>{shortcut.title}</strong>
                    <p>{shortcut.description}</p>
                  </div>
                  <i className="fas fa-arrow-right" aria-hidden="true"></i>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <style jsx global>{`
        .admin-page {
          min-height: calc(100vh - 72px);
          background: #f6f7f9;
          color: #111827;
        }

        .admin-shell {
          width: min(1480px, 100%);
          margin: 0 auto;
          padding: 24px;
        }

        .admin-header,
        .status-strip,
        .dashboard-alert,
        .panel-header,
        .metric-card,
        .attention-card,
        .shortcut-card,
        .rank-row,
        .reason-tile {
          display: flex;
          align-items: center;
        }

        .admin-header {
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 16px;
        }

        .eyebrow {
          margin: 0 0 6px;
          color: #a16207;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .admin-header h1 {
          margin: 0;
          color: #111827;
          font-size: clamp(1.7rem, 3vw, 2.35rem);
          letter-spacing: 0;
          line-height: 1.1;
        }

        .header-copy,
        .panel-header p,
        .shortcut-card p,
        .metric-card span,
        .last-activity,
        .ops-table td span,
        .empty-inline {
          color: #64748b;
        }

        .header-copy {
          margin: 8px 0 0;
          max-width: 620px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .header-actions .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          border-radius: 8px;
          font-weight: 700;
        }

        .status-strip {
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #ffffff;
          color: #475569;
          font-size: 0.9rem;
          font-weight: 650;
        }

        .status-strip div {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #16a34a;
        }

        .status-dot.warning {
          background: #d97706;
        }

        .dashboard-alert {
          justify-content: space-between;
          gap: 16px;
          border: 1px solid #fde68a;
          border-radius: 8px;
        }

        .dashboard-alert p {
          margin: 4px 0 0;
        }

        .metric-grid,
        .dashboard-grid,
        .shortcut-grid,
        .attention-grid,
        .insight-columns,
        .reason-grid {
          display: grid;
          gap: 16px;
        }

        .metric-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          margin-bottom: 16px;
        }

        .metric-card {
          justify-content: space-between;
          min-height: 136px;
          padding: 18px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #ffffff;
        }

        .metric-card p {
          margin: 0 0 8px;
          color: #475569;
          font-size: 0.9rem;
          font-weight: 750;
        }

        .metric-card h2 {
          margin: 0;
          color: #111827;
          font-size: 2.2rem;
          line-height: 1;
          letter-spacing: 0;
        }

        .metric-card span {
          display: block;
          margin-top: 10px;
          font-size: 0.9rem;
          font-weight: 650;
        }

        .metric-icon,
        .shortcut-icon,
        .attention-card > span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 8px;
          flex: 0 0 auto;
        }

        .metric-card.ink .metric-icon { background: #f1f5f9; color: #111827; }
        .metric-card.blue .metric-icon { background: #dbeafe; color: #1d4ed8; }
        .metric-card.amber .metric-icon { background: #fef3c7; color: #b45309; }
        .metric-card.green .metric-icon { background: #dcfce7; color: #047857; }

        .dashboard-grid {
          grid-template-columns: minmax(0, 1.45fr) minmax(340px, 0.8fr);
          margin-bottom: 16px;
        }

        .panel {
          min-width: 0;
          padding: 18px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #ffffff;
        }

        .panel-header {
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .panel-header h2 {
          margin: 0;
          color: #111827;
          font-size: 1.05rem;
          letter-spacing: 0;
        }

        .panel-header p {
          margin: 4px 0 0;
          font-size: 0.9rem;
        }

        .panel-link {
          color: #2563eb;
          font-weight: 750;
          text-decoration: none;
        }

        .panel-link:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }

        .attention-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .attention-card {
          gap: 12px;
          min-height: 96px;
          padding: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #ffffff;
          color: inherit;
          text-decoration: none;
        }

        .attention-card:hover,
        .shortcut-card:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
          color: inherit;
        }

        .attention-card.green > span { background: #dcfce7; color: #047857; }
        .attention-card.amber > span { background: #fef3c7; color: #b45309; }
        .attention-card.red > span { background: #fee2e2; color: #b91c1c; }

        .attention-card strong {
          display: block;
          color: #111827;
          font-size: 1.45rem;
          line-height: 1;
        }

        .attention-card p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 0.88rem;
          font-weight: 700;
        }

        .bar-list {
          display: grid;
          gap: 18px;
        }

        .bar-row > div:first-child {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          color: #475569;
          font-size: 0.9rem;
          font-weight: 750;
        }

        .bar-track {
          width: 100%;
          height: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: #e5e7eb;
        }

        .bar-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #2563eb;
        }

        .last-activity {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid #e5e7eb;
          font-size: 0.9rem;
        }

        .ops-table {
          margin: 0;
        }

        .ops-table thead th {
          border-bottom: 1px solid #e5e7eb;
          color: #64748b;
          font-size: 0.76rem;
          letter-spacing: 0;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .ops-table td {
          vertical-align: middle;
        }

        .ops-table td strong,
        .ops-table td span {
          display: block;
        }

        .notes-cell {
          max-width: 320px;
          color: #334155;
        }

        .time-cell {
          color: #64748b;
          white-space: nowrap;
        }

        .empty-table {
          height: 180px;
          color: #64748b !important;
          font-weight: 700;
          text-align: center;
          vertical-align: middle !important;
        }

        .quality-stack {
          display: grid;
          gap: 16px;
        }

        .quality-row-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
          color: #334155;
          font-size: 0.9rem;
          font-weight: 750;
        }

        .quality-track {
          height: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: #e5e7eb;
        }

        .quality-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
        }

        .quality-row.green .quality-track span { background: #16a34a; }
        .quality-row.amber .quality-track span { background: #d97706; }
        .quality-row.red .quality-track span { background: #dc2626; }

        .insight-columns {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .insight-columns h3 {
          margin: 0 0 10px;
          color: #475569;
          font-size: 0.88rem;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .rank-list {
          display: grid;
          gap: 8px;
        }

        .rank-row {
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f8fafc;
        }

        .rank-row span {
          color: #334155;
          font-weight: 650;
        }

        .rank-row strong {
          color: #111827;
        }

        .empty-inline {
          padding: 14px;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          background: #f8fafc;
          font-weight: 700;
        }

        .reason-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .reason-tile {
          justify-content: space-between;
          gap: 10px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f8fafc;
        }

        .reason-tile span {
          color: #475569;
          font-weight: 700;
        }

        .reason-tile strong {
          color: #111827;
          font-size: 1.25rem;
        }

        .shortcut-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .shortcut-card {
          gap: 14px;
          min-height: 112px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          color: inherit;
          text-decoration: none;
        }

        .shortcut-icon {
          background: #f1f5f9;
          color: #334155;
        }

        .shortcut-card strong {
          display: block;
          color: #111827;
        }

        .shortcut-card p {
          margin: 5px 0 0;
          font-size: 0.88rem;
          line-height: 1.35;
        }

        .shortcut-card > i {
          margin-left: auto;
          color: #94a3b8;
        }

        @media (max-width: 1180px) {
          .metric-grid,
          .attention-grid,
          .shortcut-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .admin-shell {
            padding: 16px;
          }

          .admin-header,
          .status-strip,
          .dashboard-alert,
          .panel-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .metric-grid,
          .attention-grid,
          .shortcut-grid,
          .insight-columns,
          .reason-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

function QualityRow({ label, value, total, tone }) {
  const percentage = total > 0 ? Math.round((Number(value || 0) / Number(total || 1)) * 100) : 0;
  return (
    <div className={`quality-row ${tone}`}>
      <div className="quality-row-header">
        <span>{label}</span>
        <strong>{formatNumber(value)} / {formatNumber(total)}</strong>
      </div>
      <div className="quality-track" aria-hidden="true">
        <span style={{ width: `${Math.max(total > 0 ? 4 : 0, percentage)}%` }}></span>
      </div>
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const { requireAdminPage } = await import('../../lib/adminPage.js');
  return requireAdminPage(ctx);
}

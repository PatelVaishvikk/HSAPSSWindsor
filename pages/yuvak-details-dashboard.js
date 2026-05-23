import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
  Table
} from 'react-bootstrap';
import {
  ArrowClockwise,
  BoxArrowUpRight,
  CalendarDate,
  CheckCircle,
  ClipboardData,
  Download,
  ExclamationTriangle,
  GeoAlt,
  Search
} from 'react-bootstrap-icons';
import Navbar from '../components/Navbar';

const PAGE_SIZE = 12;

const DETAIL_FIELD_LABELS = {
  first_name: 'First name',
  last_name: 'Last name',
  phone: 'Phone',
  date_of_birth: 'Birthdate',
  address: 'Address',
  mandal_name: 'Mandal'
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (value) => {
  if (!value) return 'No form update';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No form update';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const escapeCsv = (value) => {
  const text = String(value || '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const summarizeFields = (fields = []) =>
  fields
    .map((field) => DETAIL_FIELD_LABELS[field] || field)
    .filter(Boolean)
    .join(', ');

export default function YuvakDetailsDashboard() {
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    formUpdates: 0,
    completeAddress: 0,
    missingAddress: 0,
    missingBirthdate: 0
  });
  const [mandals, setMandals] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [mandalFilter, setMandalFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [detailFilter, setDetailFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/yuvak-details-dashboard');
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load yuvak details.');
      }

      setStudents(result.students || []);
      setStats(result.stats || {});
      setMandals(result.mandals || []);
      setCities(result.cities || []);
    } catch (dashboardError) {
      setError(dashboardError.message || 'Failed to load yuvak details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, mandalFilter, cityFilter, detailFilter]);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return students.filter((student) => {
      const haystack = [
        student.name,
        student.phone,
        student.mail_id,
        student.address,
        student.address_street,
        student.apartment_number,
        student.address_city,
        student.address_state,
        student.mandal_name,
        student.mukt_type
      ].join(' ').toLowerCase();

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      const matchesMandal = mandalFilter === 'all' || (student.mandal_name || 'Not set') === mandalFilter;
      const matchesCity = cityFilter === 'all' || (student.address_city || 'Not set') === cityFilter;
      const matchesDetails =
        detailFilter === 'all' ||
        (detailFilter === 'form-updates' && (student.has_detail_update || student.last_portal_update_at)) ||
        (detailFilter === 'complete' && student.has_complete_address && student.date_of_birth && student.mandal_name) ||
        (detailFilter === 'missing-address' && !student.has_complete_address) ||
        (detailFilter === 'missing-birthdate' && !student.date_of_birth);

      return matchesSearch && matchesMandal && matchesCity && matchesDetails;
    });
  }, [students, searchTerm, mandalFilter, cityFilter, detailFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const visibleStudents = filteredStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    const rows = [
      [
        'Name',
        'Phone',
        'Email',
        'Birthdate',
        'Street',
        'Apartment / Unit',
        'City',
        'State / Province',
        'Mandal',
        'Type',
        'Last Form Update',
        'Updated Fields'
      ],
      ...filteredStudents.map((student) => [
        student.name,
        student.phone,
        student.mail_id,
        student.date_of_birth,
        student.address_street,
        student.apartment_number,
        student.address_city,
        student.address_state,
        student.mandal_name,
        student.mukt_type,
        student.last_portal_update_at,
        summarizeFields(student.last_portal_update_fields)
      ])
    ];

    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'hsapss-windsor-yuvak-details.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head>
        <title>Yuvak Details Dashboard - HSAPSS Windsor</title>
      </Head>
      <Navbar />

      <main className="details-dashboard">
        <Container fluid="xl" className="py-4">
          <div className="details-heading">
            <div>
              <p>Admin Dashboard</p>
              <h1>Yuvak Details</h1>
            </div>
            <div className="heading-actions">
              <Button variant="outline-secondary" onClick={fetchDashboard} disabled={loading}>
                <ArrowClockwise className="me-2" />
                Refresh
              </Button>
              <Button variant="outline-dark" onClick={handleExport} disabled={filteredStudents.length === 0}>
                <Download className="me-2" />
                Export
              </Button>
              <Link href="/yuvak-details" passHref legacyBehavior>
                <Button as="a" variant="dark">
                  Public Form
                  <BoxArrowUpRight className="ms-2" />
                </Button>
              </Link>
            </div>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Row className="g-3 mb-3">
            <Col xs={6} xl={3}>
              <MetricCard label="Total records" value={stats.total || 0} icon={<ClipboardData />} tone="dark" />
            </Col>
            <Col xs={6} xl={3}>
              <MetricCard label="Form updates" value={stats.formUpdates || 0} icon={<CheckCircle />} tone="green" />
            </Col>
            <Col xs={6} xl={3}>
              <MetricCard label="Complete addresses" value={stats.completeAddress || 0} icon={<GeoAlt />} tone="blue" />
            </Col>
            <Col xs={6} xl={3}>
              <MetricCard label="Missing birthdate" value={stats.missingBirthdate || 0} icon={<CalendarDate />} tone="amber" />
            </Col>
          </Row>

          <Card className="dashboard-card">
            <Card.Body>
              <div className="details-toolbar">
                <div className="search-box">
                  <Search />
                  <Form.Control
                    type="search"
                    placeholder="Search name, phone, address, city or mandal"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
                <Form.Select value={mandalFilter} onChange={(event) => setMandalFilter(event.target.value)}>
                  <option value="all">All mandals</option>
                  {mandals.map((mandal) => (
                    <option key={mandal.label} value={mandal.label}>
                      {mandal.label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
                  <option value="all">All cities</option>
                  {cities.map((city) => (
                    <option key={city.label} value={city.label}>
                      {city.label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Select value={detailFilter} onChange={(event) => setDetailFilter(event.target.value)}>
                  <option value="all">All details</option>
                  <option value="form-updates">Form updates</option>
                  <option value="complete">Complete details</option>
                  <option value="missing-address">Missing address</option>
                  <option value="missing-birthdate">Missing birthdate</option>
                </Form.Select>
              </div>

              {loading ? (
                <div className="empty-state">
                  <Spinner animation="border" />
                  <span>Loading yuvak details...</span>
                </div>
              ) : visibleStudents.length === 0 ? (
                <div className="empty-state">
                  <ExclamationTriangle />
                  <span>No yuvak records match the current filters.</span>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table hover className="align-middle details-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Birthdate</th>
                          <th>Street</th>
                          <th>Apt / Unit</th>
                          <th>City</th>
                          <th>State</th>
                          <th>Mandal</th>
                          <th>Last Update</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleStudents.map((student) => (
                          <tr key={student._id}>
                            <td>
                              <div className="person-cell">
                                <span>{student.first_name?.[0]}{student.last_name?.[0]}</span>
                                <div>
                                  <strong>{student.name}</strong>
                                  <small>{student.mail_id || student.mukt_type || 'Yuvak'}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              {student.phone ? (
                                <a className="phone-link" href={`tel:${student.phone}`}>
                                  {student.phone}
                                </a>
                              ) : (
                                <span className="muted-copy">Not set</span>
                              )}
                            </td>
                            <td>{formatDate(student.date_of_birth)}</td>
                            <td className="address-cell">{student.address_street || <span className="muted-copy">Not set</span>}</td>
                            <td>{student.apartment_number || <span className="muted-copy">-</span>}</td>
                            <td>{student.address_city || <span className="muted-copy">Not set</span>}</td>
                            <td>{student.address_state || <span className="muted-copy">Not set</span>}</td>
                            <td>
                              <Badge bg={student.mandal_name ? 'info' : 'secondary'} text={student.mandal_name ? 'dark' : undefined}>
                                {student.mandal_name || 'Not set'}
                              </Badge>
                            </td>
                            <td>
                              <div className="update-cell">
                                <strong>{formatDateTime(student.last_portal_update_at)}</strong>
                                {summarizeFields(student.last_portal_update_fields) && (
                                  <small>{summarizeFields(student.last_portal_update_fields)}</small>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  <div className="pagination-row">
                    <span>
                      Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredStudents.length)} of {filteredStudents.length}
                    </span>
                    <div>
                      <Button variant="outline-secondary" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                        Previous
                      </Button>
                      <Button variant="outline-secondary" size="sm" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Container>
      </main>

      <style jsx global>{`
        .details-dashboard {
          background: #f6f8fb;
          min-height: calc(100vh - 72px);
        }

        .details-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .details-heading p {
          margin: 0 0 0.25rem;
          color: #64748b;
          font-weight: 700;
        }

        .details-heading h1 {
          margin: 0;
          color: #111827;
          font-size: clamp(1.6rem, 3vw, 2.25rem);
          letter-spacing: 0;
        }

        .heading-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.55rem;
          flex-wrap: wrap;
        }

        .dashboard-card {
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05) !important;
        }

        .metric-card .card-body {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem;
        }

        .metric-label {
          margin: 0 0 0.3rem;
          color: #64748b;
          font-size: 0.88rem;
          font-weight: 750;
        }

        .metric-value {
          margin: 0;
          color: #111827;
          font-size: 2rem;
          line-height: 1;
        }

        .metric-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 8px;
          background: #f3f4f6;
          color: #111827;
          flex: 0 0 auto;
        }

        .metric-card.green .metric-value,
        .metric-card.green .metric-icon {
          color: #047857;
        }

        .metric-card.blue .metric-value,
        .metric-card.blue .metric-icon {
          color: #2563eb;
        }

        .metric-card.amber .metric-value,
        .metric-card.amber .metric-icon {
          color: #b45309;
        }

        .details-toolbar {
          display: grid;
          grid-template-columns: minmax(280px, 1fr) 170px 170px 180px;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .search-box {
          position: relative;
        }

        .search-box svg {
          position: absolute;
          left: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }

        .search-box .form-control {
          padding-left: 2.4rem;
        }

        .details-table {
          margin-bottom: 0;
        }

        .details-table thead th {
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
          color: #475569;
          font-size: 0.78rem;
          letter-spacing: 0;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .details-table td {
          color: #111827;
          vertical-align: middle;
        }

        .person-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 210px;
        }

        .person-cell > span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: #111827;
          color: #ffffff;
          font-weight: 800;
          flex: 0 0 auto;
          text-transform: uppercase;
        }

        .person-cell strong,
        .person-cell small,
        .update-cell strong,
        .update-cell small {
          display: block;
        }

        .person-cell small,
        .update-cell small,
        .muted-copy {
          color: #64748b;
        }

        .phone-link {
          color: #2563eb;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }

        .address-cell {
          min-width: 220px;
          max-width: 320px;
        }

        .update-cell {
          min-width: 190px;
        }

        .update-cell strong {
          color: #111827;
          font-size: 0.92rem;
        }

        .pagination-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-top: 1rem;
          color: #64748b;
          font-weight: 700;
        }

        .pagination-row div {
          display: flex;
          gap: 0.5rem;
        }

        .empty-state {
          min-height: 260px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 0.8rem;
          color: #64748b;
          font-weight: 700;
          text-align: center;
        }

        @media (max-width: 992px) {
          .details-heading,
          .pagination-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .details-toolbar {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

function MetricCard({ label, value, icon, tone }) {
  return (
    <Card className={`dashboard-card metric-card ${tone || 'dark'}`}>
      <Card.Body>
        <div>
          <p className="metric-label">{label}</p>
          <h2 className="metric-value">{value}</h2>
        </div>
        <span className="metric-icon">{icon}</span>
      </Card.Body>
    </Card>
  );
}

export async function getServerSideProps(ctx) {
  const { requireAdminPage } = await import('../lib/adminPage.js');
  return requireAdminPage(ctx);
}

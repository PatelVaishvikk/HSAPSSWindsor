import { useEffect, useState } from 'react';
import {
  Container, Card, Table, Spinner, Alert, Row, Col, Button, Form, InputGroup, Modal, Badge, Pagination
} from 'react-bootstrap';
import { PencilSquare, Search, SortDown, SortUp, PersonFill, Plus, Download, X } from 'react-bootstrap-icons';
import Navbar from '../components/Navbar';
import Head from 'next/head';
import Link from 'next/link';
import moment from 'moment';

export default function MovedOutStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'moved_out_date', direction: 'desc' });
  const [editStudent, setEditStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ dateRange: 'all', jobType: 'all', location: 'all' });
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);

  // Fetch students
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/students?limit=0');
      if (!res.ok) throw new Error('Failed to fetch students');
      const data = await res.json();
      setStudents((data.students || []).filter(s => s.moved_out));
    } catch (err) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSave = async (updatedData) => {
    try {
      const res = await fetch(`/api/students/${editStudent?._id}`, {
        method: editStudent?._id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error('Save failed');
      await fetchStudents();
      setShowEditModal(false);
      setEditStudent(null);
    } catch (err) {
      setError(err.message || 'Save failed');
    }
  };

  const handleBulkExport = () => {
    const rows = [
      ['Name', 'Move Date', 'Position', 'Location', 'Notes'],
      ...Array.from(selected).map(id => {
        const s = students.find(x => x._id === id);
        return [
          `${s.first_name} ${s.last_name}`,
          moment(s.moved_out_date).format('YYYY-MM-DD'),
          s.moved_out_job,
          s.moved_out_address,
          s.moved_out_notes
        ];
      })
    ];
    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'moved-out-students.csv';
    a.click();
  };

  // Unique locations (city level)
  const uniqueLocations = Array.from(new Set(students.map(s => {
    if (!s.moved_out_address) return '';
    return s.moved_out_address.split(',')[0].trim();
  }))).filter(Boolean);

  // ---- Filtering and sorting ----
  let filtered = students.filter(student =>
    `${student.first_name} ${student.last_name} ${student.moved_out_job} ${student.moved_out_address}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  if (filters.jobType !== 'all') {
    filtered = filtered.filter(s => (filters.jobType === 'student' ? s.moved_out_job?.toLowerCase().includes('student') : !s.moved_out_job?.toLowerCase().includes('student')));
  }
  if (filters.location !== 'all') {
    filtered = filtered.filter(s => {
      if (!s.moved_out_address) return false;
      // City match
      return s.moved_out_address.split(',')[0].trim() === filters.location;
    });
  }
  if (filters.dateRange !== 'all') {
    const now = moment();
    filtered = filtered.filter(s => {
      const moveDate = moment(s.moved_out_date);
      if (filters.dateRange === 'last30') return now.diff(moveDate, 'days') <= 30;
      if (filters.dateRange === 'thisYear') return now.isSame(moveDate, 'year');
      return true;
    });
  }

  filtered.sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // ---- Pagination ----
  const PAGE_SIZE = 8;
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ---- Stats ----
  const stats = {
    total: students.length,
    thisMonth: students.filter(s => moment(s.moved_out_date).isSame(moment(), 'month')).length,
    employed: students.filter(s => s.moved_out_job && !s.moved_out_job.toLowerCase().includes('student')).length,
    studying: students.filter(s => s.moved_out_job && s.moved_out_job.toLowerCase().includes('student')).length,
  };

  return (
    <>
      <Head>
        <title>Moved Out Students - HSAPSS Windsor</title>
      </Head>
      <Navbar />

      <Container className="py-4">
        {/* Stats Cards */}
        <Row className="mb-4 g-2">
          <Col xs={6} md={3}><StatCard color="primary" label="Total Moved" value={stats.total} /></Col>
          <Col xs={6} md={3}><StatCard color="success" label="Moved This Month" value={stats.thisMonth} /></Col>
          <Col xs={6} md={3}><StatCard color="info" label="Employed" value={stats.employed} /></Col>
          <Col xs={6} md={3}><StatCard color="warning" label="Studying" value={stats.studying} /></Col>
        </Row>

        <Row className="mb-3 align-items-center">
          <Col xs={12} md={6}>
            <h1 className="fw-bold display-6 text-primary mb-2 mb-md-0">Moved Out Students</h1>
            <p className="lead text-muted mb-2 d-none d-md-block">Track and manage students who have relocated</p>
          </Col>
          <Col xs={12} md={6} className="text-md-end">
            <Button variant="outline-secondary" className="me-2 mb-2" onClick={() => setShowFilters(!showFilters)}>
              Filter
            </Button>
            <Button variant="primary" className="me-2 mb-2" onClick={() => { setEditStudent({}); setShowEditModal(true); }}>
              <Plus /> Add Student
            </Button>
            <Button variant="outline-dark" className="me-2 mb-2" onClick={handleBulkExport} disabled={selected.size === 0}>
              <Download /> Export Selected
            </Button>
            <Link href="/students-table" passHref legacyBehavior>
              <Button variant="outline-primary" className="rounded-pill px-4 mb-2">Back to Students</Button>
            </Link>
          </Col>
        </Row>

        {showFilters && (
          <Card className="shadow-sm border-0 mb-3">
            <Card.Body style={{ backgroundColor: '#fff' }}>
              <Row className="g-2">
                <Col xs={12} md={4}>
                  <Form.Select
                    value={filters.dateRange}
                    onChange={e => setFilters({ ...filters, dateRange: e.target.value })}
                  >
                    <option value="all">All Time</option>
                    <option value="last30">Last 30 Days</option>
                    <option value="thisYear">This Year</option>
                  </Form.Select>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Select
                    value={filters.jobType}
                    onChange={e => setFilters({ ...filters, jobType: e.target.value })}
                  >
                    <option value="all">All Positions</option>
                    <option value="student">Studying</option>
                    <option value="employed">Employed</option>
                  </Form.Select>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Select
                    value={filters.location}
                    onChange={e => setFilters({ ...filters, location: e.target.value })}
                  >
                    <option value="all">All Locations</option>
                    {uniqueLocations.map(loc => (
                      <option value={loc} key={loc}>{loc}</option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Modern Card Header with Search and Sort */}
        <Card className="shadow-lg border-0">
          <Card.Header className="bg-white py-3 border-0" style={{ backgroundColor: '#fff' }}>
            <Row className="align-items-center gx-2 gy-2 flex-column flex-md-row">
              <Col xs={12} md={7} className="order-2 order-md-1">
                <InputGroup>
                  <InputGroup.Text className="bg-white border-0">
                    <Search className="text-muted" />
                  </InputGroup.Text>
                  <Form.Control
                    type="search"
                    placeholder="Search students..."
                    className="border-0 bg-white shadow-sm rounded-pill"
                    style={{ minHeight: 44 }}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <Button
                      variant="link"
                      className="text-danger"
                      style={{ textDecoration: "none" }}
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      <X />
                    </Button>
                  )}
                </InputGroup>
              </Col>
              <Col xs={12} md={5} className="order-1 order-md-2 text-md-end text-center mb-2 mb-md-0">
                <span className="me-2 fw-semibold text-muted">Sort by:</span>
                <Button
                  variant={sortConfig.key === 'moved_out_date' ? "primary" : "outline-primary"}
                  className="me-2 rounded-pill"
                  onClick={() => handleSort('moved_out_date')}
                >
                  Date {sortConfig.key === 'moved_out_date' && (
                    sortConfig.direction === 'asc' ? <SortUp /> : <SortDown />
                  )}
                </Button>
                <Button
                  variant={sortConfig.key === 'last_name' ? "primary" : "outline-primary"}
                  className="rounded-pill"
                  onClick={() => handleSort('last_name')}
                >
                  Name {sortConfig.key === 'last_name' && (
                    sortConfig.direction === 'asc' ? <SortUp /> : <SortDown />
                  )}
                </Button>
              </Col>
            </Row>
          </Card.Header>

          <Card.Body className="p-0" style={{ backgroundColor: '#fff' }}>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <div className="mt-2 text-muted">Loading moved out students...</div>
              </div>
            ) : error ? (
              <Alert variant="danger" className="m-4">{error}</Alert>
            ) : filtered.length === 0 ? (
              <Alert variant="info" className="m-4">No matching students found</Alert>
            ) : (
              <>
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle">
                    <thead className="bg-light">
                      <tr>
                        <th>
                          <Form.Check
                            type="checkbox"
                            checked={selected.size === paged.length && paged.length > 0}
                            onChange={e => {
                              if (e.target.checked) setSelected(new Set(filtered.map(s => s._id)));
                              else setSelected(new Set());
                            }}
                          />
                        </th>
                        <th>Student</th>
                        <th>Move Date</th>
                        <th>New Position</th>
                        <th>Location</th>
                        <th>Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map(student => (
                        <tr key={student._id} className="align-middle">
                          <td>
                            <Form.Check
                              type="checkbox"
                              checked={selected.has(student._id)}
                              onChange={e => {
                                const newSel = new Set(selected);
                                if (e.target.checked) newSel.add(student._id);
                                else newSel.delete(student._id);
                                setSelected(newSel);
                              }}
                            />
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <span className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center me-2" style={{ width: 32, height: 32 }}>
                                <PersonFill className="text-white" />
                              </span>
                              <div className="fw-semibold">{student.first_name} {student.last_name}</div>
                            </div>
                          </td>
                          <td>
                            {student.moved_out_date ?
                              <span>{moment(student.moved_out_date).format('MMM D, YYYY')}</span> : 'N/A'}
                          </td>
                          <td>
                            {student.moved_out_job ?
                              <Badge bg={student.moved_out_job.toLowerCase().includes('student') ? "warning" : "info"}>
                                {student.moved_out_job}
                              </Badge> : 'Not specified'}
                          </td>
                          <td>
                            <span className="text-truncate" style={{ maxWidth: '120px', display: 'inline-block' }}>
                              {student.moved_out_address || '—'}
                            </span>
                          </td>
                          <td>
                            <span className="text-muted" title={student.moved_out_notes}>{student.moved_out_notes?.slice(0, 32)}{student.moved_out_notes && student.moved_out_notes.length > 32 ? '…' : ''}</span>
                          </td>
                          <td>
                            <Button
                              variant="link"
                              className="text-primary"
                              onClick={() => {
                                setEditStudent(student);
                                setShowEditModal(true);
                              }}
                              aria-label="Edit"
                            >
                              <PencilSquare size={20} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                {/* Pagination */}
                {pageCount > 1 && (
                  <div className="d-flex justify-content-end p-3">
                    <Pagination>
                      <Pagination.First onClick={() => setPage(1)} disabled={page === 1} />
                      <Pagination.Prev onClick={() => setPage(page - 1)} disabled={page === 1} />
                      {[...Array(pageCount)].map((_, i) => (
                        <Pagination.Item
                          key={i + 1}
                          active={page === i + 1}
                          onClick={() => setPage(i + 1)}
                        >{i + 1}</Pagination.Item>
                      ))}
                      <Pagination.Next onClick={() => setPage(page + 1)} disabled={page === pageCount} />
                      <Pagination.Last onClick={() => setPage(pageCount)} disabled={page === pageCount} />
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </Card.Body>
        </Card>

        <EditModal
          show={showEditModal}
          onHide={() => { setShowEditModal(false); setEditStudent(null); }}
          student={editStudent}
          onSave={handleSave}
        />
      </Container>
    </>
  );
}

// Modern Stat Card
function StatCard({ color = "primary", label, value }) {
  return (
    <Card className={`border-0 shadow-sm text-center bg-${color}-subtle`}>
      <Card.Body>
        <h6 className="text-muted mb-1">{label}</h6>
        <div className={`display-6 fw-bold text-${color}`}>{value}</div>
      </Card.Body>
    </Card>
  );
}

// Edit/Add Modal with solid background (no transparency)
function EditModal({ show, onHide, student, onSave }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    setFormData(student || {});
  }, [student]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    onSave({
      ...formData,
      moved_out_date: formData.moved_out_date,
      moved_out_job: formData.moved_out_job,
      moved_out_address: formData.moved_out_address,
      moved_out_notes: formData.moved_out_notes
    });
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton style={{ backgroundColor: '#fff' }}>
        <Modal.Title>{student?._id ? 'Edit Student Details' : 'Add New Moved Out Student'}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#fff' }}>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Move Date</Form.Label>
            <Form.Control
              type="date"
              name="moved_out_date"
              value={formData.moved_out_date || ''}
              onChange={handleChange}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>New Position</Form.Label>
            <Form.Control
              type="text"
              name="moved_out_job"
              value={formData.moved_out_job || ''}
              onChange={handleChange}
              placeholder="e.g., Software Engineer, University Student"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>New Address</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="moved_out_address"
              value={formData.moved_out_address || ''}
              onChange={handleChange}
              placeholder="Enter address"
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Additional Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="moved_out_notes"
              value={formData.moved_out_notes || ''}
              onChange={handleChange}
              placeholder="e.g., Accepted offer at University of Toronto"
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#fff' }}>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit}>{student?._id ? 'Save Changes' : 'Add Student'}</Button>
      </Modal.Footer>
    </Modal>
  );
}

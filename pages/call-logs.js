import { useState, useEffect } from 'react';
import {
  Modal, Button, Form, Badge, Toast, Row, Col, Offcanvas, Spinner, InputGroup
} from 'react-bootstrap';
import Navbar from '../components/Navbar';
import Head from 'next/head';
import { debounce } from 'lodash';
import dynamic from 'next/dynamic';

// Dynamically import DataTable with no SSR
const DataTable = dynamic(
  () => import('react-data-table-component').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <div className="mt-3 text-muted">Loading table...</div>
      </div>
    ),
  }
);

const CALL_REASONS = ['General', 'Job', 'Coming', 'Other'];

export default function CallLogs() {
  const [mounted, setMounted] = useState(false);
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');
  const [callLog, setCallLog] = useState({
    student_id: '',
    status: 'Completed',
    notes: '',
    needs_follow_up: false,
    follow_up_date: '',
    call_reason: 'General',
    timestamp: '',
  });
  const [filter, setFilter] = useState({
    student: '',
    status: '',
    reason: '',
    dateFrom: '',
    dateTo: '',
    recentOnly: false,
  });
  const [selectedRows, setSelectedRows] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounced search for performance
  const debouncedSetSearchTerm = debounce((val) => {
    setSearchTerm(val);
    setCurrentPage(1);
  }, 500);

  // Fetch data when filter/search/page changes
  useEffect(() => {
    if (mounted) {
      fetchCallLogs(currentPage, perPage, searchTerm, filter);
      fetchStudents();
      fetchRecentLogs();
    }
    // eslint-disable-next-line
  }, [mounted, currentPage, perPage, searchTerm, JSON.stringify(filter)]);

  // Clean filter: only send non-empty parameters
  function getCleanParams(page, limit, search, filter) {
    const params = {
      page,
      limit,
    };
    if (search && search.trim()) params.search = search.trim();
    if (filter.student) params.student = filter.student;
    if (filter.status) params.status = filter.status;
    if (filter.reason) params.reason = filter.reason;
    if (filter.dateFrom) params.dateFrom = filter.dateFrom;
    if (filter.dateTo) params.dateTo = filter.dateTo;
    if (filter.recentOnly) params.recent = '1';
    return params;
  }

  // Fetch call logs with robust filters
  const fetchCallLogs = async (page = 1, limit = perPage, search = '', filterObj = {}) => {
    setLoading(true);
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const paramsObj = getCleanParams(page, limit, search, filterObj);
      const params = new URLSearchParams(paramsObj);
      const response = await fetch(`${baseUrl}/api/call-logs?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch call logs');
      setCallLogs(data.callLogs);
      setTotalRows(data.total);
      setCurrentPage(data.currentPage);
    } catch (error) {
      showToastMessage(error.message, 'danger');
      setCallLogs([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch students for dropdown
  const fetchStudents = async () => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${baseUrl}/api/students?limit=100`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch students');
      setStudents(data.students);
    } catch (error) {
      showToastMessage(error.message, 'danger');
    }
  };

  // Fetch recent call logs
  const fetchRecentLogs = async () => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${baseUrl}/api/call-logs?limit=5&sort=desc`);
      const data = await response.json();
      if (response.ok) setRecentLogs(data.callLogs);
    } catch {
      /* ignore */
    }
  };

  const showToastMessage = (message, variant = 'success') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleSearch = (e) => {
    debouncedSetSearchTerm(e.target.value);
  };

  const handlePageChange = (page) => setCurrentPage(page);

  const handlePerRowsChange = (newPerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
  };

  const handleFilterChange = (field, value) => {
    setFilter((f) => ({ ...f, [field]: value }));
    setCurrentPage(1);
  };

  const handleAddCallLog = () => {
    setCallLog({
      student_id: '',
      status: 'Completed',
      notes: '',
      needs_follow_up: false,
      follow_up_date: '',
      call_reason: 'General',
      timestamp: '',
    });
    setShowAddModal(true);
  };

  const saveCallLog = async () => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${baseUrl}/api/call-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callLog),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save call log');
      setShowAddModal(false);
      showToastMessage('Call log saved successfully');
      fetchCallLogs(currentPage, perPage, searchTerm, filter);
      fetchRecentLogs();
    } catch (error) {
      showToastMessage(error.message, 'danger');
    }
  };

  // Delete a single log
  const handleDelete = async (logId) => {
    if (!confirm('Delete this call log?')) return;
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${baseUrl}/api/call-logs?id=${logId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete call log');
      showToastMessage('Call log deleted');
      fetchCallLogs(currentPage, perPage, searchTerm, filter);
      fetchRecentLogs();
    } catch (error) {
      showToastMessage(error.message, 'danger');
    }
  };

  // Delete selected logs (bulk)
  const handleBulkDelete = async () => {
    if (!selectedRows.length || !confirm('Delete selected call logs?')) return;
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${baseUrl}/api/call-logs/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedRows.map((row) => row._id) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete selected call logs');
      showToastMessage('Selected call logs deleted');
      setSelectedRows([]);
      fetchCallLogs(currentPage, perPage, searchTerm, filter);
      fetchRecentLogs();
    } catch (error) {
      showToastMessage(error.message, 'danger');
    }
  };

  // Delete last dialed log
  const handleDeleteLastDialed = async () => {
    if (!recentLogs.length) return;
    const lastLog = recentLogs[0];
    await handleDelete(lastLog._id);
  };

  // DataTable columns
  const columns = [
    {
      name: 'Student',
      selector: (row) =>
        row.student ? `${row.student.first_name} ${row.student.last_name}` :
        row.student_id ? `${row.student_id.first_name} ${row.student_id.last_name}` : 'Unknown',
      sortable: true,
      cell: (row) => (
        <div className="d-flex align-items-center">
          <div className="avatar-circle me-2">
            {row.student ? row.student.first_name.charAt(0) :
             row.student_id ? row.student_id.first_name.charAt(0) : '?'}
          </div>
          <div>
            <div className="fw-bold">
              {row.student ? `${row.student.first_name} ${row.student.last_name}` :
                row.student_id ? `${row.student_id.first_name} ${row.student_id.last_name}` :
                'Unknown Student'}
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Status',
      selector: (row) => row.status,
      sortable: true,
      cell: (row) => (
        <Badge bg={
          row.status === 'Completed' ? 'success' :
          row.status === 'No Answer' ? 'danger' :
          row.status === 'Left Message' ? 'warning' :
          row.status === 'Rescheduled' ? 'info' : 'secondary'
        }>
          {row.status}
        </Badge>
      ),
    },
    {
      name: 'Reason',
      selector: (row) => row.call_reason || 'General',
      sortable: true,
      cell: (row) => (
        <Badge bg={
          row.call_reason === 'Job' ? 'primary' :
          row.call_reason === 'Coming' ? 'info' :
          row.call_reason === 'General' ? 'secondary' :
          'dark'
        }>
          {row.call_reason || 'General'}
        </Badge>
      ),
    },
    {
      name: 'Notes',
      selector: (row) => row.notes,
      sortable: true,
      wrap: true,
      cell: (row) => row.notes || <span className="text-muted">No notes</span>
    },
    {
      name: 'Date',
      selector: (row) => row.date || row.timestamp,
      sortable: true,
      cell: (row) => {
        const dateStr = row.date || row.timestamp;
        if (!dateStr) return <span className="text-muted">No date</span>;
        const parsed = new Date(dateStr);
        if (isNaN(parsed.getTime())) return <span className="text-muted">No date</span>;
        return <span>{parsed.toLocaleString()}</span>;
      }
    },
    {
      name: 'Follow-up',
      selector: (row) => row.needs_follow_up,
      sortable: true,
      cell: (row) =>
        row.needs_follow_up && row.follow_up_date ? (
          <Badge bg="warning">
            {new Date(row.follow_up_date).toLocaleDateString()}
          </Badge>
        ) : <span className="text-muted">—</span>
    },
    {
      name: 'Actions',
      cell: (row) => (
        <Button variant="danger" size="sm" onClick={() => handleDelete(row._id)} title="Delete">
          <i className="fas fa-trash"></i>
        </Button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true
    }
  ];

  // Filter options
  const statusOptions = ['', 'Completed', 'No Answer', 'Left Message', 'Rescheduled'];

  return (
    <>
      <Head>
        <title>Call Logs - HSAPSS Windsor</title>
      </Head>
      <Navbar />

      <div className="container-fluid py-4">
        <Row className="mb-3 g-3 align-items-center">
          <Col xs={12} md={3}>
            <h1 className="h3 mb-0">Call Logs</h1>
          </Col>
          <Col xs={12} md={6}>
            <div className="d-flex flex-wrap gap-2">
              <Button variant="primary" onClick={handleAddCallLog}>
                <i className="fas fa-plus me-2"></i> Add Call Log
              </Button>
              <Button variant="danger" onClick={handleBulkDelete} disabled={selectedRows.length === 0}>
                <i className="fas fa-trash me-2"></i> Delete Selected
              </Button>
              <Button variant="outline-secondary" onClick={() => setShowRecent(true)}>
                <i className="fas fa-clock me-2"></i> View Recent Calls
              </Button>
              <Button variant="outline-danger" onClick={handleDeleteLastDialed} disabled={!recentLogs.length}>
                <i className="fas fa-phone-slash me-2"></i> Delete Last Dialed
              </Button>
            </div>
          </Col>
        </Row>

        {/* Advanced Filters */}
        <div className="card mb-4 sticky-top" style={{ top: 70, zIndex: 1 }}>
          <div className="card-body">
            <Row className="gy-2 gx-3 align-items-center">
              <Col md={3}>
                <InputGroup>
                  <span className="input-group-text"><i className="fas fa-search"></i></span>
                  <Form.Control
                    type="text"
                    placeholder="Search students or notes..."
                    onChange={handleSearch}
                  />
                </InputGroup>
              </Col>
              <Col md={2}>
                <Form.Select value={filter.status} onChange={e => handleFilterChange('status', e.target.value)}>
                  <option value="">Status</option>
                  {statusOptions.filter(Boolean).map(s =>
                    <option key={s} value={s}>{s}</option>
                  )}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Select value={filter.reason} onChange={e => handleFilterChange('reason', e.target.value)}>
                  <option value="">Reason</option>
                  {CALL_REASONS.map(r =>
                    <option key={r} value={r}>{r}</option>
                  )}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Select value={filter.student} onChange={e => handleFilterChange('student', e.target.value)}>
                  <option value="">All Students</option>
                  {students.map(s =>
                    <option key={s._id} value={s._id}>{s.first_name} {s.last_name}</option>
                  )}
                </Form.Select>
              </Col>
              <Col md={3} className="d-flex gap-2">
                <Form.Control type="date" value={filter.dateFrom} onChange={e => handleFilterChange('dateFrom', e.target.value)} />
                <Form.Control type="date" value={filter.dateTo} onChange={e => handleFilterChange('dateTo', e.target.value)} />
              </Col>
              <Col md={2} className="d-flex align-items-center">
                <Form.Check
                  label="Recent only"
                  checked={filter.recentOnly}
                  onChange={e => handleFilterChange('recentOnly', e.target.checked)}
                />
              </Col>
            </Row>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <DataTable
              columns={columns}
              data={callLogs}
              progressPending={loading}
              pagination
              paginationServer
              paginationTotalRows={totalRows}
              onChangeRowsPerPage={handlePerRowsChange}
              onChangePage={handlePageChange}
              paginationPerPage={perPage}
              paginationRowsPerPageOptions={[10, 25, 50, 100]}
              sortServer
              responsive
              selectableRows
              onSelectedRowsChange={({ selectedRows }) => setSelectedRows(selectedRows)}
              customStyles={{
                table: { style: { minWidth: '700px' } },
              }}
            />
          </div>
        </div>
      </div>

      {/* Add/Edit Call Log Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Call Log</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Student</Form.Label>
              <Form.Select
                value={callLog.student_id}
                onChange={(e) => setCallLog({ ...callLog, student_id: e.target.value })}
                required
              >
                <option value="">Select a student</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.first_name} {student.last_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={callLog.status}
                onChange={(e) => setCallLog({ ...callLog, status: e.target.value })}
                required
              >
                {statusOptions.filter(Boolean).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Call Reason</Form.Label>
              <Form.Select
                value={callLog.call_reason}
                onChange={(e) => setCallLog({ ...callLog, call_reason: e.target.value })}
                required
              >
                {CALL_REASONS.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={callLog.notes}
                onChange={(e) => setCallLog({ ...callLog, notes: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Needs Follow-up"
                checked={callLog.needs_follow_up}
                onChange={(e) => setCallLog({ ...callLog, needs_follow_up: e.target.checked })}
              />
            </Form.Group>

            {callLog.needs_follow_up && (
              <Form.Group className="mb-3">
                <Form.Label>Follow-up Date</Form.Label>
                <Form.Control
                  type="date"
                  value={callLog.follow_up_date}
                  onChange={(e) => setCallLog({ ...callLog, follow_up_date: e.target.value })}
                  required
                />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Call Date & Time</Form.Label>
              <Form.Control
                type="datetime-local"
                value={callLog.timestamp ? new Date(callLog.timestamp).toISOString().slice(0,16) : ''}
                onChange={e => setCallLog({ ...callLog, timestamp: e.target.value ? new Date(e.target.value).toISOString() : '' })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveCallLog}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Recent Calls Offcanvas */}
      <Offcanvas show={showRecent} onHide={() => setShowRecent(false)} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Recent Calls</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {recentLogs.length === 0 ? (
            <div className="text-center text-muted">No recent calls</div>
          ) : (
            recentLogs.map((log, idx) => (
              <div key={log._id || idx} className="mb-3 pb-2 border-bottom">
                <div className="fw-bold">
                  {log.student ? `${log.student.first_name} ${log.student.last_name}` : 'Unknown'}
                </div>
                <div>
                  <Badge bg={
                    log.status === 'Completed' ? 'success' :
                    log.status === 'No Answer' ? 'danger' :
                    log.status === 'Left Message' ? 'warning' :
                    log.status === 'Rescheduled' ? 'info' : 'secondary'
                  }>
                    {log.status}
                  </Badge>{' '}
                  <Badge bg={
                    log.call_reason === 'Job' ? 'primary' :
                    log.call_reason === 'Coming' ? 'info' :
                    log.call_reason === 'General' ? 'secondary' : 'dark'
                  }>
                    {log.call_reason}
                  </Badge>
                </div>
                <div className="small text-muted">
                  {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                </div>
                <div className="text-muted">{log.notes}</div>
              </div>
            ))
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Toast Notification */}
      <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1051 }}>
        <Toast show={showToast} onClose={() => setShowToast(false)} delay={2500} autohide style={{ minWidth: '250px' }}>
          <Toast.Header className={toastVariant === 'success' ? 'bg-success text-white' : 'bg-danger text-white'}>
            <strong className="me-auto">{toastVariant === 'success' ? 'Success' : 'Error'}</strong>
          </Toast.Header>
          <Toast.Body className={`${toastVariant === 'success' ? 'text-success' : 'text-danger'} fw-semibold`}>
            {toastMessage}
          </Toast.Body>
        </Toast>
      </div>

      {/* Avatar CSS */}
      <style jsx global>{`
        .avatar-circle {
          width: 32px; height: 32px;
          background: #e7eaf3;
          color: #233;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: bold; font-size: 1.15rem;
        }
        .dataTable table { font-size: 1rem; }
        .sticky-top { position: sticky !important; }
        @media (max-width: 576px) {
          .card-body, .modal-content { padding: 0.75rem !important; }
          .dataTable table { min-width: 550px !important; }
        }
      `}</style>
    </>
  );
}

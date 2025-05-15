import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import {
  Container,
  Form,
  Button,
  Spinner,
  Alert,
  Row,
  Col,
  Modal,
  Card,
  Table,
  Badge,
  ProgressBar,
  Toast,
  ToastContainer,
  Dropdown,
  InputGroup,
  Stack
} from 'react-bootstrap';
import { 
  FaQrcode, 
  FaHistory, 
  FaDownload, 
  FaSync, 
  FaTrash, 
  FaUserCheck,
  FaSearch,
  FaFilter,
  FaUserTimes,
  FaUserPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaExclamationTriangle,
  FaBars
} from 'react-icons/fa';

import dynamic from 'next/dynamic';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
} from 'chart.js';
import Navigation from '../components/Navbar';
import styles from '../styles/Attendance.module.css';
import { format, parseISO, isFriday, parse, isValid } from 'date-fns';

// Register Chart.js components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement,
  BarElement,
  Title
);

// Dynamic imports with loading states
const Pie = dynamic(
  () => import('react-chartjs-2').then((mod) => mod.Pie),
  { 
    ssr: false,
    loading: () => <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
  }
);

const QrScanner = dynamic(
  () => import('react-qr-scanner').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
  }
);

const DataTable = dynamic(
  () => import('react-data-table-component').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
  }
);

// Constants
const LOW_ATTENDANCE_THRESHOLD = 50;
const HIGH_ATTENDANCE_THRESHOLD = 80;
const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';

export default function AttendancePage() {
  // State management
  const [assemblyDate, setAssemblyDate] = useState(format(new Date(), DEFAULT_DATE_FORMAT));
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    students: false,
    attendance: false,
    submitting: false,
    deleting: false,
    resetting: false,
    history: false
  });

  // Analytics states
  const [dailyStats, setDailyStats] = useState({
    present: 0,
    absent: 0,
    percentage: 0
  });
  const [overallAttendance, setOverallAttendance] = useState({});

  // Modal states
  const [modalStates, setModalStates] = useState({
    qrScanner: false,
    studentHistory: false,
    confirmDelete: false,
    confirmReset: false,
    deleteTarget: null,
    datesHistory: false
  });

  // Data states
  const [historyData, setHistoryData] = useState({
    records: [],
    student: null
  });
  const [qrScanData, setQrScanData] = useState({
    result: '',
    scanning: false,
    success: ''
  });

  // UI states
  const [uiStates, setUiStates] = useState({
    searchText: '',
    filterStatus: 'all',
    selectedStudents: [],
    toasts: []
  });

  // Add these new state variables at the top with other state declarations
  const [historyStats, setHistoryStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    attendancePercentage: 0
  });

  // Add this to the state declarations at the top of the component
  const [error, setError] = useState('');

  // Add new state for attendance dates history
  const [attendanceDatesHistory, setAttendanceDatesHistory] = useState({
    loading: false,
    dates: [],
    error: null
  });

  // Toast notification system
  const showToast = useCallback((type, message, autoClose = true) => {
    const newToast = {
      id: Date.now(),
      type,
      message,
      autoClose
    };
    
    setUiStates(prev => ({
      ...prev,
      toasts: [...prev.toasts, newToast]
    }));
    
    if (autoClose) {
      setTimeout(() => {
        setUiStates(prev => ({
          ...prev,
          toasts: prev.toasts.filter(t => t.id !== newToast.id)
        }));
      }, 5000);
    }
  }, []);

  // Fetch students data
  const fetchStudents = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, students: true }));
    try {
      const res = await fetch('/api/students?limit=0');
      if (!res.ok) throw new Error('Failed to fetch students');
      const data = await res.json();
      setStudents((data.students || []).filter(s => !s.moved_out));
      
      // Initialize attendance state
      const initialAttendance = {};
      data.students.forEach(student => {
        initialAttendance[student._id] = false;
      });
      setAttendance(initialAttendance);
    } catch (err) {
      console.error("Error fetching students:", err);
      showToast('error', 'Failed to load students');
    } finally {
      setLoadingStates(prev => ({ ...prev, students: false }));
    }
  }, [showToast]);

  // Fetch attendance data
  const fetchAttendanceData = useCallback(async (date) => {
    if (!date) return;
    setLoadingStates(prev => ({ ...prev, attendance: true }));
    
    try {
      const res = await fetch(`/api/attendance?assemblyDate=${date}&limit=0`);
      if (!res.ok) throw new Error('Failed to fetch attendance');
      const data = await res.json();
      
      // Initialize all students as absent first
      const newAttendance = {};
      students.forEach(student => {
        newAttendance[student._id] = false;
      });
      
      // Update with actual attendance data
      data.attendances.forEach(rec => {
        if (rec.student?._id) {
          newAttendance[rec.student._id] = rec.attended;
        }
      });
      
      setAttendance(newAttendance);
      
      // Calculate stats
      const presentCount = Object.values(newAttendance).filter(Boolean).length;
      const totalCount = students.length;
      const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
      
      setDailyStats({
        present: presentCount,
        absent: totalCount - presentCount,
        percentage
      });
    } catch (err) {
      console.error('Error fetching attendance:', err);
      showToast('error', 'Failed to load attendance data');
    } finally {
      setLoadingStates(prev => ({ ...prev, attendance: false }));
    }
  }, [students, showToast]);

  // Fetch overall attendance stats
  const fetchOverallAttendance = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance?limit=0');
      if (!res.ok) throw new Error('Failed to fetch overall attendance');
      const data = await res.json();
      
      // Calculate Friday attendance percentages
      const fridayRecords = data.attendances.filter(rec => 
        isFriday(parseISO(rec.assemblyDate))
      );
      
      const studentCounts = {};
      const studentTotals = {};
      
      fridayRecords.forEach(rec => {
        if (rec.student?._id) {
          if (rec.attended) studentCounts[rec.student._id] = (studentCounts[rec.student._id] || 0) + 1;
          studentTotals[rec.student._id] = (studentTotals[rec.student._id] || 0) + 1;
        }
      });
      
      // Calculate percentages
      const overall = {};
      Object.keys(studentTotals).forEach(id => {
        overall[id] = Math.round((studentCounts[id] || 0) / studentTotals[id] * 100);
      });
      
      setOverallAttendance(overall);
    } catch (err) {
      console.error('Error fetching overall attendance:', err);
      showToast('error', 'Failed to load attendance statistics');
    }
  }, [showToast]);

  // Initial data loading
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Load attendance when date changes
  useEffect(() => {
    if (assemblyDate) {
      fetchAttendanceData(assemblyDate);
      fetchOverallAttendance();
    }
  }, [assemblyDate, fetchAttendanceData, fetchOverallAttendance]);

  // Mobile responsive adjustments
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle attendance for a student
  const handleToggleAttendance = useCallback((studentId) => {
    setAttendance(prev => {
      const newAttendance = { ...prev };
      newAttendance[studentId] = !prev[studentId];
      
      // Update daily stats
      const presentCount = Object.values(newAttendance).filter(Boolean).length;
      const totalCount = students.length;
      const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
      
      setDailyStats({
        present: presentCount,
        absent: totalCount - presentCount,
        percentage
      });
      
      return newAttendance;
    });
  }, [students.length]);

  // Bulk attendance actions
  const handleBulkAction = useCallback((action) => {
    setAttendance(prev => {
      const newAttendance = { ...prev };
      uiStates.selectedStudents.forEach(student => {
        switch (action) {
          case 'markPresent':
            newAttendance[student._id] = true;
            break;
          case 'markAbsent':
            newAttendance[student._id] = false;
            break;
          case 'toggle':
            newAttendance[student._id] = !prev[student._id];
            break;
          default:
            break;
        }
      });
      
      // Update daily stats
      const presentCount = Object.values(newAttendance).filter(Boolean).length;
      const totalCount = students.length;
      const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
      
      setDailyStats({
        present: presentCount,
        absent: totalCount - presentCount,
        percentage
      });
      
      return newAttendance;
    });
    
    setUiStates(prev => ({ ...prev, selectedStudents: [] }));
    showToast('success', `Updated ${uiStates.selectedStudents.length} students`);
  }, [uiStates.selectedStudents, students.length, showToast]);

  // Submit attendance to server
  const submitAttendance = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, submitting: true }));
    try {
      // Prepare updates array with all students
      const updates = students.map(student => ({
        student: student._id,
        assemblyDate,
        attended: attendance[student._id] || false
      }));
      
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      
      if (!res.ok) throw new Error('Failed to submit attendance');
      
      showToast('success', 'Attendance saved successfully');
      fetchAttendanceData(assemblyDate);
      fetchOverallAttendance();
    } catch (err) {
      console.error('Error submitting attendance:', err);
      showToast('error', 'Failed to save attendance');
    } finally {
      setLoadingStates(prev => ({ ...prev, submitting: false }));
    }
  }, [attendance, assemblyDate, students, fetchAttendanceData, fetchOverallAttendance, showToast]);

  // Delete attendance functions
  const confirmDelete = (type, id = null, date = null) => {
    setModalStates({
      ...modalStates,
      confirmDelete: true,
      deleteTarget: { type, id, date }
    });
  };

  const performDelete = async () => {
    const { type, id, date } = modalStates.deleteTarget;
    setLoadingStates(prev => ({ ...prev, deleting: true }));
    setModalStates(prev => ({ ...prev, confirmDelete: false }));
    
    try {
      let url = '/api/attendance?';
      if (type === 'single' && id) url += `id=${id}`;
      else if (type === 'student' && id && date) url += `studentId=${id}&date=${date}`;
      else if (type === 'date' && date) url += `date=${date}`;
      else if (type === 'all') url = '/api/attendance';
      
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete attendance');
      
      const message = 
        type === 'single' ? 'Attendance record deleted' :
        type === 'student' ? 'Student attendance cleared' :
        type === 'date' ? `Attendance for ${format(parseISO(date), 'MMM d, yyyy')} cleared` :
        'All attendance data reset';
      
      showToast('success', message);
      fetchAttendanceData(assemblyDate);
      fetchOverallAttendance();
    } catch (err) {
      console.error('Error deleting attendance:', err);
      showToast('error', 'Failed to delete attendance');
    } finally {
      setLoadingStates(prev => ({ ...prev, deleting: false }));
    }
  };

  // QR Scanner handlers
  const handleQrError = useCallback((err) => {
    console.error("QR Scanner Error:", err);
    showToast('error', 'QR Scanner error');
  }, [showToast]);

  const handleQrScan = useCallback(async (result) => {
    if (!result || qrScanData.scanning) return;
    setQrScanData(prev => ({ ...prev, scanning: true, success: '' }));
    
    try {
      const student = students.find(s => s._id === result);
      if (!student) throw new Error('Student not found');
      
      // Update local state first
      setAttendance(prev => {
        const newAttendance = { ...prev, [student._id]: true };
        
        // Update daily stats
        const presentCount = Object.values(newAttendance).filter(Boolean).length;
        const totalCount = students.length;
        const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
        
        setDailyStats({
          present: presentCount,
          absent: totalCount - presentCount,
          percentage
        });
        
        return newAttendance;
      });
      
      // Then update server
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student: student._id,
          assemblyDate,
          attended: true
        })
      });
      
      if (!res.ok) throw new Error('Failed to mark attendance');
      
      setQrScanData(prev => ({
        ...prev,
        success: `${student.first_name} ${student.last_name} marked present`
      }));
      
      showToast('success', 'Attendance marked via QR');
    } catch (err) {
      console.error("QR Attendance Error:", err);
      showToast('error', 'QR scan failed');
    } finally {
      setTimeout(() => {
        setQrScanData(prev => ({ ...prev, scanning: false }));
      }, 2000);
    }
  }, [assemblyDate, students, qrScanData.scanning, showToast]);

  // Add this new function before the viewHistory function
  const calculateAttendanceStats = (records) => {
    const totalDays = records.length;
    const presentDays = records.filter(record => record.attended).length;
    const absentDays = totalDays - presentDays;
    const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      attendancePercentage
    };
  };

  // Replace the existing viewHistory function with this enhanced version
  const viewHistory = async (student) => {
    setHistoryData(prev => ({ ...prev, student }));
    setLoadingStates(prev => ({ ...prev, history: true }));
    try {
      const res = await fetch(`/api/attendance?studentId=${student._id}&limit=0`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch history data');
      
      // Get all attendance records and sort by date
      const allRecords = (data.attendances || []).sort((a, b) => 
        new Date(b.assemblyDate) - new Date(a.assemblyDate)
      );

      setHistoryData(prev => ({ ...prev, records: allRecords }));
      setHistoryStats(calculateAttendanceStats(allRecords));
      setModalStates(prev => ({ ...prev, studentHistory: true }));
    } catch (err) {
      console.error("Error fetching student history:", err);
      showToast('error', 'Failed to fetch student history');
    } finally {
      setLoadingStates(prev => ({ ...prev, history: false }));
    }
  };

  // Export attendance data
  const exportAttendanceData = useCallback(() => {
    try {
      const csvContent = [
        'Student ID,Name,Status,Attendance Percentage',
        ...students.map(student => {
          const status = attendance[student._id] ? 'Present' : 'Absent';
          const percentage = overallAttendance[student._id] || 'N/A';
          return `${student._id},"${student.first_name} ${student.last_name}",${status},${percentage}%`;
        })
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_${assemblyDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('success', 'Attendance exported');
    } catch (err) {
      console.error("Export error:", err);
      showToast('error', 'Export failed');
    }
  }, [students, attendance, overallAttendance, assemblyDate]);

  // Add function to fetch attendance dates history
  const fetchAttendanceDatesHistory = useCallback(async () => {
    setAttendanceDatesHistory(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/attendance/dates');
      if (!res.ok) throw new Error('Failed to fetch attendance dates');
      const data = await res.json();
      
      // Sort dates in descending order
      const sortedDates = data.dates.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAttendanceDatesHistory(prev => ({ 
        ...prev, 
        dates: sortedDates,
        loading: false 
      }));
    } catch (err) {
      console.error('Error fetching attendance dates:', err);
      setAttendanceDatesHistory(prev => ({ 
        ...prev, 
        error: 'Failed to load attendance dates',
        loading: false 
      }));
    }
  }, []);

  // Add useEffect to fetch dates when modal opens
  useEffect(() => {
    if (modalStates.datesHistory) {
      fetchAttendanceDatesHistory();
    }
  }, [modalStates.datesHistory, fetchAttendanceDatesHistory]);

  // Responsive columns configuration
  const columns = useMemo(() => [
    {
      name: 'Student',
      selector: row => `${row.first_name} ${row.last_name}`,
      sortable: true,
      cell: row => (
        <div className="d-flex align-items-center">
          <div className="me-2">
            {attendance[row._id] ? (
              <FaCheckCircle className="text-success" />
            ) : (
              <FaTimesCircle className="text-danger" />
            )}
          </div>
          <div>
            <div className="fw-medium text-truncate" style={{ maxWidth: '150px' }}>
              {`${row.first_name} ${row.last_name}`}
            </div>
            <div className="text-muted small">{row.grade || 'No grade'}</div>
          </div>
        </div>
      ),
      minWidth: '180px'
    },
    {
      name: 'Status',
      selector: row => attendance[row._id],
      sortable: true,
      cell: row => {
        const percentage = overallAttendance[row._id];
        return (
          <div className="d-flex align-items-center">
            <div>
              <Form.Switch
                id={`attendance-switch-${row._id}`}
                checked={attendance[row._id] || false}
                onChange={() => handleToggleAttendance(row._id)}
                className="me-2"
              />
            </div>
            <div className="d-flex flex-column">
              <div className="d-flex align-items-center">
                <Badge 
                  bg={
                    percentage >= HIGH_ATTENDANCE_THRESHOLD ? 'success' :
                    percentage >= LOW_ATTENDANCE_THRESHOLD ? 'warning' : 'danger'
                  }
                  className="me-1 me-md-2"
                >
                  {percentage ? `${percentage}%` : 'N/A'}
                </Badge>
                <small className="text-muted d-none d-md-inline">
                  {attendance[row._id] ? 'Present' : 'Absent'}
                </small>
              </div>
              <ProgressBar className="mt-1 d-none d-md-block" style={{ height: '4px' }}>
                <ProgressBar 
                  variant={
                    percentage >= HIGH_ATTENDANCE_THRESHOLD ? 'success' :
                    percentage >= LOW_ATTENDANCE_THRESHOLD ? 'warning' : 'danger'
                  }
                  now={percentage || 0} 
                />
              </ProgressBar>
            </div>
          </div>
        );
      },
      minWidth: '150px'
    },
    {
      name: 'Actions',
      cell: row => (
        <div className="d-flex">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => viewHistory(row)}
            className="me-1 me-md-2 d-flex align-items-center"
          >
            <FaHistory className="d-none d-md-inline me-md-1" />
            <span className="d-md-none">Hist</span>
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => confirmDelete('student', row._id, assemblyDate)}
            disabled={loadingStates.deleting}
            className="d-flex align-items-center"
          >
            <FaTrash className="d-none d-md-inline me-md-1" />
            <span className="d-md-none">Del</span>
          </Button>
        </div>
      ),
      width: '120px'
    }
  ], [attendance, overallAttendance, viewHistory, loadingStates.deleting, assemblyDate]);

  // Filter students based on search and filter criteria
  const filteredStudents = useMemo(() => {
    const searchTerm = uiStates.searchText.toLowerCase();
    
    return students.filter(student => {
      // Search filter
      const matchesSearch = 
        student.first_name.toLowerCase().includes(searchTerm) ||
        student.last_name.toLowerCase().includes(searchTerm) ||
        student.grade?.toLowerCase().includes(searchTerm);
      
      if (!matchesSearch) return false;
      
      // Status filter
      switch (uiStates.filterStatus) {
        case 'present': return attendance[student._id] === true;
        case 'absent': return attendance[student._id] !== true;
        case 'low': return (overallAttendance[student._id] || 0) < LOW_ATTENDANCE_THRESHOLD;
        case 'high': return (overallAttendance[student._id] || 0) >= HIGH_ATTENDANCE_THRESHOLD;
        default: return true;
      }
    });
  }, [students, uiStates.searchText, uiStates.filterStatus, attendance, overallAttendance]);

  // Daily attendance chart data
  const dailyChartData = useMemo(() => ({
    labels: ['Present', 'Absent'],
    datasets: [{
      data: [dailyStats.present, dailyStats.absent],
      backgroundColor: ['#28a745', '#dc3545'],
      borderColor: ['#218838', '#c82333'],
      borderWidth: 1
    }]
  }), [dailyStats]);

  return (
    <div className={styles.attendancePage}>
      <Head>
        <title>Attendance Management | School System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <Navigation />
      
      <Container fluid className="py-2 py-md-4 px-3">
        {/* Mobile header */}
        <div className="d-flex d-md-none justify-content-between align-items-center mb-3">
          <Button
            variant="outline-secondary"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="me-2"
          >
            <FaBars />
          </Button>
          <h5 className="mb-0">Attendance</h5>
          <div style={{ width: '40px' }}></div> {/* Spacer */}
        </div>

        {/* Mobile sidebar */}
        {mobileSidebarOpen && (
          <Card className="mb-3 d-md-none">
            <Card.Body>
              <Row className="g-2">
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label>Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={assemblyDate}
                      onChange={(e) => setAssemblyDate(e.target.value)}
                      max={format(new Date(), DEFAULT_DATE_FORMAT)}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label>Filter</Form.Label>
                    <Form.Select
                      value={uiStates.filterStatus}
                      onChange={(e) => setUiStates(prev => ({
                        ...prev,
                        filterStatus: e.target.value
                      }))}
                    >
                      <option value="all">All Students</option>
                      <option value="present">Present Only</option>
                      <option value="absent">Absent Only</option>
                      <option value="low">Low Attendance</option>
                      <option value="high">High Attendance</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label>Search</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>
                        <FaSearch />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Search..."
                        value={uiStates.searchText}
                        onChange={(e) => setUiStates(prev => ({
                          ...prev,
                          searchText: e.target.value
                        }))}
                      />
                    </InputGroup>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Main Card */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
            <div className="d-none d-md-block">
              <h4 className="mb-0">Attendance Management</h4>
              <small className="opacity-75">
                {format(parse(assemblyDate, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')}
              </small>
            </div>
            <div className="d-flex">
              <Button
                variant="light"
                className="me-2 d-flex align-items-center"
                onClick={() => setModalStates(prev => ({ ...prev, qrScanner: true }))}
                disabled={loadingStates.students}
                size="sm"
              >
                <FaQrcode className="me-1" /> <span className="d-none d-md-inline">QR Scanner</span>
              </Button>
              <Button 
                variant="light"
                className="me-2 d-flex align-items-center"
                onClick={() => setModalStates(prev => ({ ...prev, datesHistory: true }))}
                size="sm"
              >
                <FaHistory className="me-1" /> 
                <span className="d-none d-md-inline">Dates History</span>
                <span className="d-md-none">History</span>
              </Button>
              <Dropdown>
                <Dropdown.Toggle variant="light" className="d-flex align-items-center" size="sm">
                  <FaDownload className="me-1" /> <span className="d-none d-md-inline">Export</span>
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={exportAttendanceData}>
                    Current View
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => showToast('info', 'Full export coming soon', false)}>
                    Full History
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </Card.Header>
          
          <Card.Body>
            {/* Desktop Filters - Hidden on mobile */}
            <Row className="mb-4 g-3 d-none d-md-flex">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Assembly Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={assemblyDate}
                    onChange={(e) => setAssemblyDate(e.target.value)}
                    max={format(new Date(), DEFAULT_DATE_FORMAT)}
                  />
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Quick Filter</Form.Label>
                  <Form.Select
                    value={uiStates.filterStatus}
                    onChange={(e) => setUiStates(prev => ({
                      ...prev,
                      filterStatus: e.target.value
                    }))}
                  >
                    <option value="all">All Students</option>
                    <option value="present">Present Only</option>
                    <option value="absent">Absent Only</option>
                    <option value="low">Low Attendance (&lt;50%)</option>
                    <option value="high">High Attendance (&ge;80%)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Search Students</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search by name or grade..."
                      value={uiStates.searchText}
                      onChange={(e) => setUiStates(prev => ({
                        ...prev,
                        searchText: e.target.value
                      }))}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>

            {/* Stats and Charts - Responsive layout */}
            <Row className="mb-4">
              <Col md={4} className="mb-3 mb-md-0">
                <Card className="h-100">
                  <Card.Body className="text-center">
                    <h5>Today&apos;s Attendance</h5>
                    {dailyStats.present + dailyStats.absent > 0 ? (
                      <>
                        <div className={styles.chartContainer} style={{ height: '200px' }}>
                          <Pie 
                            data={dailyChartData} 
                            options={{ 
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { position: 'bottom' },
                                tooltip: {
                                  callbacks: {
                                    label: (context) => {
                                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                      const value = context.raw || 0;
                                      const percentage = Math.round((value / total) * 100);
                                      return `${context.label}: ${value} (${percentage}%)`;
                                    }
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                        <div className="mt-3">
                          <Badge bg="success" className="me-2">
                            Present: {dailyStats.present}
                          </Badge>
                          <Badge bg="danger">
                            Absent: {dailyStats.absent}
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <div className="py-4 text-muted">
                        No attendance data for selected date
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={8}>
                <Card className="h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Attendance Summary</h5>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => {
                          fetchAttendanceData(assemblyDate);
                          fetchOverallAttendance();
                        }}
                        disabled={loadingStates.attendance}
                      >
                        <FaSync className={loadingStates.attendance ? 'spin' : ''} />
                      </Button>
                    </div>
                    
                    <div className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span>Attendance Rate</span>
                        <span>{dailyStats.percentage}%</span>
                      </div>
                      <ProgressBar>
                        <ProgressBar 
                          variant={
                            dailyStats.percentage >= HIGH_ATTENDANCE_THRESHOLD ? 'success' :
                            dailyStats.percentage >= LOW_ATTENDANCE_THRESHOLD ? 'warning' : 'danger'
                          }
                          now={dailyStats.percentage} 
                          label={`${dailyStats.percentage}%`}
                        />
                      </ProgressBar>
                    </div>
                    
                    <Row className="g-2">
                      <Col xs={12} md={6}>
                        <Card className="bg-light">
                          <Card.Body className="py-2">
                            <div className="d-flex align-items-center">
                              <div className="bg-success bg-opacity-10 p-2 rounded me-3">
                                <FaUserCheck className="text-success" />
                              </div>
                              <div>
                                <div className="text-muted small">Highest Attendance</div>
                                <div className="fw-medium text-truncate">
                                  {students.length > 0 ? (
                                    (() => {
                                      const student = [...students].sort((a, b) => 
                                        (overallAttendance[b._id] || 0) - (overallAttendance[a._id] || 0)
                                      )[0];
                                      return `${student.first_name} ${student.last_name} (${overallAttendance[student._id] || 0}%)`;
                                    })()
                                  ) : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      
                      <Col xs={12} md={6}>
                        <Card className="bg-light">
                          <Card.Body className="py-2">
                            <div className="d-flex align-items-center">
                              <div className="bg-danger bg-opacity-10 p-2 rounded me-3">
                                <FaUserTimes className="text-danger" />
                              </div>
                              <div>
                                <div className="text-muted small">Lowest Attendance</div>
                                <div className="fw-medium text-truncate">
                                  {students.length > 0 ? (
                                    (() => {
                                      const student = [...students].sort((a, b) => 
                                        (overallAttendance[a._id] || 100) - (overallAttendance[b._id] || 100)
                                      )[0];
                                      return `${student.first_name} ${student.last_name} (${overallAttendance[student._id] || 0}%)`;
                                    })()
                                  ) : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Data Table */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Student Attendance</h5>
                {uiStates.selectedStudents.length > 0 && (
                  <Dropdown>
                    <Dropdown.Toggle variant="primary" size="sm">
                      Bulk Actions ({uiStates.selectedStudents.length})
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => handleBulkAction('markPresent')}>
                        <FaUserPlus className="me-2 text-success" /> Mark Present
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleBulkAction('markAbsent')}>
                        <FaUserTimes className="me-2 text-danger" /> Mark Absent
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleBulkAction('toggle')}>
                        <FaSync className="me-2 text-primary" /> Toggle Status
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                )}
              </div>
              
              <div className="table-responsive">
                <DataTable
                  columns={columns}
                  data={filteredStudents}
                  pagination
                  paginationPerPage={10}
                  paginationRowsPerPageOptions={[5, 10, 25, 50]}
                  selectableRows
                  onSelectedRowsChange={({ selectedRows }) => setUiStates(prev => ({
                    ...prev,
                    selectedStudents: selectedRows
                  }))}
                  progressPending={loadingStates.students || loadingStates.attendance}
                  progressComponent={
                    <div className="py-5 text-center">
                      <Spinner animation="border" variant="primary" size="sm" />
                    </div>
                  }
                  striped
                  highlightOnHover
                  responsive
                  dense
                  customStyles={{
                    headCells: {
                      style: {
                        fontWeight: 'bold',
                        backgroundColor: '#f8f9fa'
                      }
                    },
                    cells: {
                      style: {
                        padding: '8px'
                      }
                    }
                  }}
                  noDataComponent={
                    <div className="py-5 text-center text-muted">
                      {loadingStates.students ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        'No students found matching your criteria'
                      )}
                    </div>
                  }
                />
              </div>
            </div>

            {/* Action Buttons - Responsive Stack */}
            <Stack direction="horizontal" gap={2} className="flex-wrap justify-content-between">
              <Stack direction="horizontal" gap={2} className="flex-wrap">
                <Button
                  variant="outline-danger"
                  onClick={() => confirmDelete('date', null, assemblyDate)}
                  disabled={loadingStates.deleting}
                  size="sm"
                >
                  {loadingStates.deleting ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <FaTrash className="me-2" />
                  )}
                  <span className="d-none d-md-inline">Clear Today&apos;s</span>
                  <span className="d-md-none">Clear</span>
                </Button>
                
                <Button
                  variant="danger"
                  onClick={() => confirmDelete('all')}
                  disabled={loadingStates.deleting}
                  size="sm"
                >
                  {loadingStates.deleting ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <FaTrash className="me-2" />
                  )}
                  <span className="d-none d-md-inline">Reset All</span>
                  <span className="d-md-none">Reset</span>
                </Button>
              </Stack>
              
              <Button
                variant="primary"
                size="sm"
                onClick={submitAttendance}
                disabled={loadingStates.submitting || loadingStates.students}
                className="d-flex align-items-center"
              >
                {loadingStates.submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FaUserCheck className="me-2" />
                    <span>Save Attendance</span>
                  </>
                )}
              </Button>
            </Stack>
          </Card.Body>
        </Card>

        {/* QR Scanner Modal */}
        <Modal
          show={modalStates.qrScanner}
          onHide={() => setModalStates(prev => ({ ...prev, qrScanner: false }))}
          centered
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>QR Code Scanner</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="text-center mb-3">
              <p className="text-muted">
                Scan a student&apos;s QR code to mark them as present for today
              </p>
            </div>
            
            {modalStates.qrScanner && (
              <div className={styles.qrScannerWrapper}>
                <QrScanner
                  delay={300}
                  onError={handleQrError}
                  onScan={handleQrScan}
                  style={{ width: '100%', maxHeight: '400px' }}
                />
              </div>
            )}
            
            {qrScanData.success && (
              <Alert variant="success" className="mt-3">
                <FaCheckCircle className="me-2" />
                {qrScanData.success}
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setModalStates(prev => ({ ...prev, qrScanner: false }))}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Student History Modal */}
        <Modal
          show={modalStates.studentHistory}
          onHide={() => setModalStates(prev => ({ ...prev, studentHistory: false }))}
          size="lg"
          scrollable
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Attendance History - {historyData.student ? 
                `${historyData.student.first_name} ${historyData.student.last_name}` : ''}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {loadingStates.history ? (
              <div className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
              </div>
            ) : (
              <>
                {historyData.student && (
                  <div className="mb-4">
                    <Row>
                      <Col md={6}>
                        <div className="mb-2">
                          <span className="text-muted">Student ID:</span>{' '}
                          <span className="fw-medium">{historyData.student._id}</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-muted">Grade:</span>{' '}
                          <span className="fw-medium">{historyData.student.grade || 'N/A'}</span>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-2">
                          <span className="text-muted">Overall Attendance:</span>{' '}
                          <Badge 
                            bg={
                              overallAttendance[historyData.student._id] >= HIGH_ATTENDANCE_THRESHOLD ? 'success' :
                              overallAttendance[historyData.student._id] >= LOW_ATTENDANCE_THRESHOLD ? 'warning' : 'danger'
                            }
                          >
                            {overallAttendance[historyData.student._id] || 0}%
                          </Badge>
                        </div>
                        <div className="mb-2">
                          <span className="text-muted">Current Status:</span>{' '}
                          <Badge bg={historyData.student ? (historyData.student.attended ? 'success' : 'danger') : 'secondary'}>
                            {historyData.student ? (historyData.student.attended ? 'Present' : 'Absent') : 'No data'}
                          </Badge>
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}
                
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Day</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.records.length > 0 ? (
                      historyData.records.map(record => (
                        <tr key={record._id}>
                          <td>{format(parseISO(record.assemblyDate), 'MMM d, yyyy')}</td>
                          <td>{format(parseISO(record.assemblyDate), 'EEEE')}</td>
                          <td>
                            <Badge bg={record.attended ? 'success' : 'danger'}>
                              {record.attended ? 'Present' : 'Absent'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-muted">
                          No attendance records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setModalStates(prev => ({ ...prev, studentHistory: false }))}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          show={modalStates.confirmDelete}
          onHide={() => setModalStates(prev => ({ ...prev, confirmDelete: false }))}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Confirm Deletion</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="danger">
              <FaExclamationTriangle className="me-2" />
              <strong>Warning!</strong> This action cannot be undone. Are you sure you want to continue?
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setModalStates(prev => ({ ...prev, confirmDelete: false }))}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={performDelete}
              disabled={loadingStates.deleting}
            >
              {loadingStates.deleting ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <FaTrash className="me-2" />
              )}
              Confirm Delete
            </Button>
          </Modal.Footer>
        </Modal>

        {/* History Modal */}
        <div className={styles.modalWrapper}>
          <Modal
            show={modalStates.studentHistory}
            onHide={() => setModalStates(prev => ({ ...prev, studentHistory: false }))}
            size="lg"
          >
            <Modal.Header closeButton>
              <Modal.Title>
                Attendance History - {historyData.student ? `${historyData.student.first_name} ${historyData.student.last_name}` : ''}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {loadingStates.history ? (
                <div className={`text-center py-4 ${styles.spinnerWrapper}`}>
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : (
                <>
                  <Card className="mb-4">
                    <Card.Body>
                      <h5 className="mb-3">Attendance Summary</h5>
                      <Row>
                        <Col md={3}>
                          <div className="text-center">
                            <h6>Total Days</h6>
                            <h3>{historyStats.totalDays}</h3>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="text-center text-success">
                            <h6>Present Days</h6>
                            <h3>{historyStats.presentDays}</h3>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="text-center text-danger">
                            <h6>Absent Days</h6>
                            <h3>{historyStats.absentDays}</h3>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="text-center">
                            <h6>Attendance Rate</h6>
                            <h3>{historyStats.attendancePercentage}%</h3>
                          </div>
                        </Col>
                      </Row>
                      <div className={styles.progressWrapper}>
                        <ProgressBar className="mt-3">
                          <ProgressBar 
                            variant="success" 
                            now={historyStats.attendancePercentage} 
                            label={`${historyStats.attendancePercentage}%`} 
                          />
                        </ProgressBar>
                      </div>
                    </Card.Body>
                  </Card>

                  {historyData.records.length > 0 ? (
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.records.map(record => (
                          <tr key={record._id}>
                            <td>{new Date(record.assemblyDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}</td>
                            <td>
                              <div className={styles.badgeWrapper}>
                                <Badge bg={record.attended ? 'success' : 'danger'}>
                                  {record.attended ? 'Present' : 'Absent'}
                                </Badge>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <Alert variant="info">
                      No attendance records found for this student.
                    </Alert>
                  )}
                </>
              )}
            </Modal.Body>
          </Modal>
        </div>

        {/* Attendance Dates History Modal */}
        <Modal
          show={modalStates.datesHistory}
          onHide={() => setModalStates(prev => ({ ...prev, datesHistory: false }))}
          size="xl"
          scrollable
        >
          <Modal.Header closeButton>
            <Modal.Title>Attendance History by Date</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {attendanceDatesHistory.loading ? (
              <div className="text-center py-4">
                <Spinner animation="border" variant="primary" />
              </div>
            ) : attendanceDatesHistory.error ? (
              <Alert variant="danger">
                <FaExclamationTriangle className="me-2" />
                {attendanceDatesHistory.error}
              </Alert>
            ) : (
              <div>
                {attendanceDatesHistory.dates.map(dateData => (
                  <Card key={dateData.date} className="mb-3">
                    <Card.Header>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          {(() => {
                            const parsedDate = parse(dateData.date, 'yyyy-MM-dd', new Date());
                            const isDateValid = isValid(parsedDate);
                            return (
                              <>
                                <h5 className="mb-0">{isDateValid ? format(parsedDate, 'MMMM d, yyyy') : 'Invalid date'}</h5>
                                <small className="text-muted">{isDateValid ? format(parsedDate, 'EEEE') : ''}</small>
                              </>
                            );
                          })()}
                        </div>
                        <div className="d-flex align-items-center">
                          <div className="text-end me-3">
                            <div>
                              <Badge bg="success" className="me-1">Present: {dateData.presentCount}</Badge>
                              <Badge bg="danger" className="me-1">Absent: {dateData.absentCount}</Badge>
                              <Badge 
                                bg={
                                  (dateData.presentCount / dateData.totalCount * 100) >= HIGH_ATTENDANCE_THRESHOLD ? 'success' :
                                  (dateData.presentCount / dateData.totalCount * 100) >= LOW_ATTENDANCE_THRESHOLD ? 'warning' : 'danger'
                                }
                              >
                                {Math.round(dateData.presentCount / dateData.totalCount * 100)}%
                              </Badge>
                            </div>
                            <small className="text-muted">Total: {dateData.totalCount} students</small>
                          </div>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setAssemblyDate(dateData.date);
                              setModalStates(prev => ({ ...prev, datesHistory: false }));
                            }}
                          >
                            View Full Day
                          </Button>
                        </div>
                      </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                      <div className="table-responsive">
                        <Table hover className="mb-0">
                          <thead>
                            <tr>
                              <th>Student Name</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dateData.students
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map(student => (
                                <tr key={student.id}>
                                  <td>{student.name}</td>
                                  <td>
                                    <Badge 
                                      bg={student.attended ? 'success' : 'danger'}
                                      className="d-inline-flex align-items-center"
                                    >
                                      {student.attended ? (
                                        <><FaCheckCircle className="me-1" /> Present</>
                                      ) : (
                                        <><FaTimesCircle className="me-1" /> Absent</>
                                      )}
                                    </Badge>
                                  </td>
                                </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setModalStates(prev => ({ ...prev, datesHistory: false }))}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
}
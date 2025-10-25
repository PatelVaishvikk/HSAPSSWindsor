import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  Button,
  Form,
  Badge,
  Toast,
  Row,
  Col,
  Offcanvas,
  Spinner,
  InputGroup
} from 'react-bootstrap';
import Navbar from '../components/Navbar';
import Head from 'next/head';
import { debounce } from 'lodash';
import dynamic from 'next/dynamic';
import { formatDistanceToNowStrict } from 'date-fns';

// Dynamically import DataTable with no SSR
const DataTable = dynamic(
  () => import('react-data-table-component').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <div className="mt-3 text-muted">Preparing table...</div>
      </div>
    ),
  }
);

const CALL_STATUSES = ['Completed', 'No Answer', 'Left Message', 'Rescheduled'];
const CALL_REASONS = ['General', 'Job', 'Coming', 'Other'];

const FILTER_TEMPLATE = {
  student: '',
  status: '',
  reason: '',
  study: '',
  sort: 'recent',
  dateFrom: '',
  dateTo: '',
  recentOnly: false,
};

const createDefaultFilters = () => ({ ...FILTER_TEMPLATE });

const createEmptyCallLog = () => ({
  student_id: '',
  status: CALL_STATUSES[0],
  notes: '',
  needs_follow_up: false,
  follow_up_date: '',
  call_reason: CALL_REASONS[0],
  timestamp: '',
});

const createDefaultSummary = () => ({
  statusCounts: {},
  reasonCounts: {},
  studyCounts: {},
  followUps: {
    total: 0,
    overdue: 0,
  },
  lastActivity: null,
});

const CALL_STATUS_META = {
  Completed: { variant: 'success', label: 'Completed' },
  'No Answer': { variant: 'danger', label: 'No Answer' },
  'Left Message': { variant: 'warning', label: 'Left Message' },
  Rescheduled: { variant: 'info', label: 'Rescheduled' },
};

const CALL_REASON_META = {
  General: { variant: 'secondary', label: 'General' },
  Job: { variant: 'primary', label: 'Job' },
  Coming: { variant: 'info', label: 'Coming' },
  Other: { variant: 'dark', label: 'Other' },
};

const SORT_OPTIONS = [
  { value: 'recent', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'study_asc', label: 'Study A–Z' },
  { value: 'study_desc', label: 'Study Z–A' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
];

const getStatusMeta = (status) => CALL_STATUS_META[status] || { variant: 'secondary', label: status || 'Unknown' };
const getReasonMeta = (reason) => CALL_REASON_META[reason] || { variant: 'dark', label: reason || (reason ? reason : 'Other') };

const formatStudentName = (student) => {
  if (!student) return 'Unknown Student';
  const first = student.first_name || '';
  const last = student.last_name || '';
  const full = `${first} ${last}`.trim();
  return full || 'Unknown Student';
};

const getInitials = (student) => {
  if (!student) return '?';
  const first = student.first_name ? student.first_name.charAt(0) : '';
  const last = student.last_name ? student.last_name.charAt(0) : '';
  const initials = `${first}${last}`.trim();
  return initials ? initials.toUpperCase() : '?';
};

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

const formatDateOnly = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
};
const sanitizePhoneNumber = (phone) => {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
};


export default function CallLogs() {
  const [mounted, setMounted] = useState(false);
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');
  const [callLog, setCallLog] = useState(createEmptyCallLog);
  const [filter, setFilter] = useState(createDefaultFilters);
  const [selectedRows, setSelectedRows] = useState([]);
  const [clearSelectedRowsToggle, setClearSelectedRowsToggle] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  const [summary, setSummary] = useState(createDefaultSummary);
  const [showFilters, setShowFilters] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [messageSending, setMessageSending] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToastMessage = useCallback((message, variant = 'success') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  }, []);

  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        setSearchTerm(value.trim());
        setCurrentPage(1);
      }, 400),
    []
  );

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  const handleSearch = useCallback(
    (event) => {
      const value = event.target.value;
      setSearchInput(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const getCleanParams = (page, limit, search, filterObj) => {
    const params = {
      page,
      limit,
    };
    if (search && search.trim()) params.search = search.trim();
    if (filterObj.student) params.student = filterObj.student;
    if (filterObj.status) params.status = filterObj.status;
    if (filterObj.reason) params.reason = filterObj.reason;
    if (filterObj.study) params.study = filterObj.study;
    if (filterObj.sort && filterObj.sort !== 'recent') params.sort = filterObj.sort;
    if (filterObj.dateFrom) params.dateFrom = filterObj.dateFrom;
    if (filterObj.dateTo) params.dateTo = filterObj.dateTo;
    if (filterObj.recentOnly) params.recent = '1';
    return params;
  };

  const fetchCallLogs = useCallback(
    async (page, limit, searchValue, filterValue) => {
      setLoading(true);
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const paramsObj = getCleanParams(
          page ?? 1,
          limit ?? perPage,
          searchValue ?? '',
          filterValue ?? {}
        );
        const params = new URLSearchParams(paramsObj);
        const response = await fetch(`${baseUrl}/api/call-logs?${params}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch call logs');

        setCallLogs(data.callLogs);
        setTotalRows(data.total);
        setCurrentPage(data.currentPage);
        setSummary(() =>
          data.summary
            ? {
                statusCounts: data.summary.statusCounts || {},
                reasonCounts: data.summary.reasonCounts || {},
                studyCounts: data.summary.studyCounts || {},
                followUps: {
                  total: data.summary.followUps?.total || 0,
                  overdue: data.summary.followUps?.overdue || 0,
                },
                lastActivity: data.summary.lastActivity || null,
              }
            : createDefaultSummary()
        );
      } catch (error) {
        setCallLogs([]);
        setTotalRows(0);
        setSummary(createDefaultSummary());
        showToastMessage(error.message, 'danger');
      } finally {
        setLoading(false);
      }
    },
    [perPage, showToastMessage]
  );

  const fetchStudents = useCallback(async () => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${baseUrl}/api/students?limit=0`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch students');
      setStudents(data.students);
    } catch (error) {
      showToastMessage(error.message, 'danger');
    }
  }, [showToastMessage]);

  const fetchRecentLogs = useCallback(async () => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${baseUrl}/api/call-logs?limit=5`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch recent call logs');
      setRecentLogs(data.callLogs);
    } catch (error) {
      showToastMessage(error.message, 'danger');
    }
  }, [showToastMessage]);

  useEffect(() => {
    if (!mounted) return;
    fetchCallLogs(currentPage, perPage, searchTerm, filter);
  }, [
    mounted,
    currentPage,
    perPage,
    searchTerm,
    filter.status,
    filter.reason,
    filter.study,
    filter.student,
    filter.dateFrom,
    filter.dateTo,
    filter.recentOnly,
    filter.sort,
    fetchCallLogs,
  ]);

  useEffect(() => {
    if (!mounted) return;
    fetchStudents();
    fetchRecentLogs();
  }, [mounted, fetchStudents, fetchRecentLogs]);

  const handleFilterChange = (field, value) => {
    setFilter((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    debouncedSearch.cancel();
    setSearchInput('');
    setSearchTerm('');
    setFilter(createDefaultFilters());
    setCurrentPage(1);
    fetchCallLogs(1, perPage, '', createDefaultFilters());
  };

  const handleAddCallLog = () => {
    setCallLog(createEmptyCallLog());
    setShowAddModal(true);
  };

  const saveCallLog = async () => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const payload = {
        ...callLog,
        timestamp: callLog.timestamp || undefined,
      };
      const response = await fetch(`${baseUrl}/api/call-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const handleDelete = async (logId) => {
    if (!confirm('Delete this call log?')) return;
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${baseUrl}/api/call-logs?id=${logId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete call log');
      showToastMessage('Call log deleted');
      setClearSelectedRowsToggle((prev) => !prev);
      setSelectedRows([]);
      fetchCallLogs(currentPage, perPage, searchTerm, filter);
      fetchRecentLogs();
    } catch (error) {
      showToastMessage(error.message, 'danger');
    }
  };

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
      setClearSelectedRowsToggle((prev) => !prev);
      fetchCallLogs(currentPage, perPage, searchTerm, filter);
      fetchRecentLogs();
    } catch (error) {
      showToastMessage(error.message, 'danger');
    }
  };

  const handleDeleteLastDialed = async () => {
    if (!recentLogs.length) return;
    const lastLog = recentLogs[0];
    await handleDelete(lastLog._id);
  };

  const handleOpenMessageModal = useCallback(() => {
    setShowMessageModal(true);
    setSendToAll(true);
    setSelectedRecipients([]);
    setRecipientSearch('');
  }, []);

  const handleCloseMessageModal = useCallback(() => {
    setShowMessageModal(false);
    setMessageSending(false);
  }, []);

  const handleAddRecipient = useCallback((student) => {
    setSelectedRecipients((prev) => {
      if (prev.some((item) => item._id === student._id)) {
        return prev;
      }
      return [...prev, student];
    });
  }, []);

  const handleRemoveRecipient = useCallback((studentId) => {
    setSelectedRecipients((prev) => prev.filter((student) => student._id !== studentId));
  }, []);

  const selectedRecipientIds = useMemo(
    () => selectedRecipients.map((student) => student._id),
    [selectedRecipients]
  );

  const filteredRecipients = useMemo(() => {
    const query = recipientSearch.trim().toLowerCase();
    return students
      .filter((student) => !selectedRecipientIds.includes(student._id))
      .filter((student) => {
        if (!query) return true;
        const name = `${student.first_name || ''} ${student.last_name || ''}`.trim().toLowerCase();
        const phone = (student.phone || '').toLowerCase();
        const studyValue = (student.study || '').toLowerCase();
        return (
          name.includes(query) ||
          phone.includes(query) ||
          studyValue.includes(query)
        );
      })
      .slice(0, 20);
  }, [students, recipientSearch, selectedRecipientIds]);

  const selectedRecipientsSorted = useMemo(
    () =>
      [...selectedRecipients].sort((a, b) => {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      }),
    [selectedRecipients]
  );

const handleSendWhatsAppMessage = useCallback(async () => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage) {
      showToastMessage('Please enter a WhatsApp message before sending.', 'danger');
      return;
    }

    const recipients = sendToAll ? students : selectedRecipientsSorted;
    if (!recipients.length) {
      showToastMessage('Select at least one student to send the message.', 'danger');
      return;
    }

    const preparedRecipients = recipients
      .map((student) => {
        const sanitizedPhone = sanitizePhoneNumber(student.phone || '');
        if (!sanitizedPhone || sanitizedPhone.length < 8) {
          return null;
        }
        return { student, phone: sanitizedPhone };
      })
      .filter(Boolean);

    const missingPhones = recipients.length - preparedRecipients.length;

    if (!preparedRecipients.length) {
      showToastMessage('None of the selected students have a valid phone number.', 'danger');
      return;
    }

    const fallbackToBrowser = (extraMessage = '') => {
      if (typeof window === 'undefined') {
        showToastMessage(extraMessage || 'Unable to send WhatsApp messages in this environment.', 'danger');
        return;
      }
      const encodedMessage = encodeURIComponent(trimmedMessage);
      const tabCount = preparedRecipients.length;
      if (tabCount > 12) {
        const proceed = window.confirm(`This will attempt to open ${tabCount} WhatsApp tabs. Continue?`);
        if (!proceed) {
          return;
        }
      }
      preparedRecipients.forEach(({ phone }, index) => {
        setTimeout(() => {
          const popup = window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank', 'noopener');
          if (!popup) {
            console.warn('WhatsApp popup blocked by browser.');
          }
        }, index * 350);
      });

      setShowMessageModal(false);
      setMessageText('');
      setSelectedRecipients([]);
      setRecipientSearch('');
      setSendToAll(true);

      const baseMessage =
        preparedRecipients.length === 1
          ? 'WhatsApp chat opened – ready to send.'
          : `WhatsApp chats opened – ${preparedRecipients.length} chats ready to send.`;
      const numberMessage = missingPhones > 0 ? ` Skipped ${missingPhones} without valid numbers.` : '';
      const mergedMessage = `${extraMessage ? `${extraMessage} ` : ''}${baseMessage}${numberMessage} Allow pop-ups so every chat can open.`;
      showToastMessage(mergedMessage.trim(), 'success');
    };

    try {
      setMessageSending(true);
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedMessage,
          recipients: preparedRecipients.map(({ student, phone }) => ({
            phone,
            studentId: student?._id || null,
            name: formatStudentName(student),
          })),
        }),
      });

      if (response.status === 501) {
        const data = await response.json().catch(() => ({}));
        fallbackToBrowser(data?.error || 'Server-side WhatsApp messaging is not configured.');
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send WhatsApp messages.');
      }

      setShowMessageModal(false);
      setMessageText('');
      setSelectedRecipients([]);
      setRecipientSearch('');
      setSendToAll(true);

      const successMessage =
        data.successCount === 1
          ? 'Sent 1 WhatsApp message successfully.'
          : `Sent ${data.successCount} WhatsApp messages successfully.`;
      const failureMessage =
        data.failureCount > 0
          ? ` ${data.failureCount} message${data.failureCount === 1 ? '' : 's'} failed.`
          : '';
      const numberMessage = missingPhones > 0 ? ` Skipped ${missingPhones} without valid numbers.` : '';
      if (data.failureCount > 0 && Array.isArray(data.failures)) {
        console.warn('WhatsApp messaging failures', data.failures);
      }

      showToastMessage(
        `${successMessage}${failureMessage}${numberMessage}`.trim(),
        data.failureCount > 0 ? 'warning' : 'success'
      );
    } catch (error) {
      fallbackToBrowser('Unable to send via server – falling back to opening WhatsApp chats.');
    } finally {
      setMessageSending(false);
    }
  }, [
    messageText,
    sendToAll,
    students,
    selectedRecipientsSorted,
    showToastMessage,
  ]);

  const handlePageChange = (page) => setCurrentPage(page);
  const handlePerRowsChange = (newPerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
  };
  const columns = useMemo(
    () => [
      {
        name: 'Student',
        selector: (row) => formatStudentName(row.student),
        sortable: true,
        minWidth: '220px',
        cell: (row) => {
          const student = row.student;
          const name = formatStudentName(student);
          const contact = student?.phone || student?.mail_id || 'No contact info';
          return (
        <div className="d-flex align-items-center gap-2">
          <div className="avatar-circle flex-shrink-0">{getInitials(student)}</div>
          <div>
            <div className="fw-semibold text-dark">{name}</div>
            <div className="text-muted small">{contact}</div>
            {student?.study && (
              <div className="text-muted small">{student.study}</div>
            )}
          </div>
        </div>
      );
    },
  },
      {
        name: 'Status',
        selector: (row) => row.status || 'Unknown',
        sortable: true,
        width: '150px',
        cell: (row) => {
          const meta = getStatusMeta(row.status);
          return (
            <Badge bg={meta.variant} className="rounded-pill px-3 py-2 fw-semibold">
              {meta.label}
            </Badge>
          );
        },
      },
      {
        name: 'Reason',
        selector: (row) => row.call_reason || 'General',
        sortable: true,
        width: '150px',
        cell: (row) => {
          const meta = getReasonMeta(row.call_reason);
          return (
            <Badge bg={meta.variant} className="rounded-pill px-3 py-2 fw-semibold">
              {meta.label}
            </Badge>
          );
        },
      },
      {
        name: 'Study',
        selector: (row) => (row.student && row.student.study ? row.student.study : ''),
        sortable: true,
        width: '200px',
        cell: (row) => {
          const studyValue = row.student && row.student.study ? row.student.study : '';
          return studyValue ? (
            <span className="badge rounded-pill text-bg-light border px-3 py-2 fw-semibold">
              {studyValue}
            </span>
          ) : (
            <span className="text-muted">Not set</span>
          );
        },
      },
      {
        name: 'Notes',
        selector: (row) => row.notes || '',
        sortable: true,
        wrap: true,
        grow: 2,
        cell: (row) =>
          row.notes ? (
            <span className="text-secondary">{row.notes}</span>
          ) : (
            <span className="text-muted">No notes captured</span>
          ),
      },
      {
        name: 'Date',
        selector: (row) => row.timestamp || row.date || '',
        sortable: true,
        width: '200px',
        cell: (row) => {
          const date = row.timestamp || row.date;
          return date ? (
            <div>
              <div className="fw-semibold">{formatDateTime(date)}</div>
            </div>
          ) : (
            <span className="text-muted">No date</span>
          );
        },
      },
      {
        name: 'Follow-up',
        selector: (row) => row.follow_up_date || '',
        sortable: true,
        width: '180px',
        cell: (row) => {
          if (!row.needs_follow_up || !row.follow_up_date) {
            return <span className="text-muted">No follow-up</span>;
          }
          const followUpDate = new Date(row.follow_up_date);
          const isOverdue = !Number.isNaN(followUpDate.getTime()) && followUpDate < new Date();
          return (
            <Badge bg={isOverdue ? 'danger' : 'warning'} className="rounded-pill px-3 py-2 fw-semibold text-dark">
              {formatDateOnly(row.follow_up_date)}
            </Badge>
          );
        },
      },
      {
        name: 'Actions',
        width: '120px',
        cell: (row) => (
          <div className="d-flex gap-2">
            <Button variant="danger" size="sm" onClick={() => handleDelete(row._id)} title="Delete">
              <i className="fas fa-trash"></i>
            </Button>
          </div>
        ),
        ignoreRowClick: true,
        allowOverflow: true,
        button: true,
      },
    ],
    [handleDelete]
  );

  const tableStyles = useMemo(
    () => ({
      table: {
        style: {
          minWidth: '720px',
        },
      },
      headRow: {
        style: {
          backgroundColor: '#f8f9fb',
          borderBottomColor: '#e8edf6',
          borderBottomWidth: '1px',
          minHeight: '52px',
        },
      },
      headCells: {
        style: {
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#6c757d',
        },
      },
      rows: {
        style: {
          minHeight: '64px',
          borderBottomColor: '#eef2f7',
          borderBottomWidth: '1px',
        },
        highlightOnHoverStyle: {
          backgroundColor: '#f5f9ff',
        },
      },
      cells: {
        style: {
          fontSize: '0.95rem',
          color: '#1f2a37',
        },
      },
      pagination: {
        style: {
          borderTop: '1px solid #e8edf6',
          padding: '0.75rem',
        },
      },
    }),
    []
  );
  const studyOptions = useMemo(() => {
    const values = new Set();
    let hasEmpty = false;
    students.forEach((student) => {
      const value = typeof student.study === 'string' ? student.study.trim() : '';
      if (value) {
        values.add(value);
      } else {
        hasEmpty = true;
      }
    });
    const sorted = Array.from(values).sort((a, b) => a.localeCompare(b));
    if (hasEmpty) {
      sorted.push('__none__');
    }
    return sorted;
  }, [students]);
  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        searchTerm ||
          filter.status ||
          filter.reason ||
          filter.study ||
          filter.student ||
          filter.dateFrom ||
          filter.dateTo ||
          filter.recentOnly ||
          (filter.sort && filter.sort !== 'recent')
      ),
    [
      searchTerm,
      filter.status,
      filter.reason,
      filter.study,
      filter.student,
      filter.dateFrom,
      filter.dateTo,
      filter.recentOnly,
      filter.sort,
    ]
  );

  const statusCounts = summary.statusCounts || {};
  const completedCount = statusCounts.Completed || 0;
  const noAnswerCount = statusCounts['No Answer'] || 0;
  const followUpsDue = summary.followUps?.total || 0;
  const overdueFollowUps = summary.followUps?.overdue || 0;

  const lastActivityText = useMemo(() => {
    if (!summary.lastActivity) return 'No calls logged yet';
    const date = new Date(summary.lastActivity);
    if (Number.isNaN(date.getTime())) return 'No calls logged yet';
    return `${formatDistanceToNowStrict(date)} ago`;
  }, [summary.lastActivity]);

  const reasonMetrics = useMemo(() => {
    const countsMap = new Map();
    Object.entries(summary.reasonCounts || {}).forEach(([reason, count]) => {
      countsMap.set(reason, count);
    });
    CALL_REASONS.forEach((reason) => {
      if (!countsMap.has(reason)) countsMap.set(reason, 0);
    });
    return Array.from(countsMap.entries());
  }, [summary.reasonCounts]);

  const studyMetrics = useMemo(() => {
    const counts = summary.studyCounts || {};
    const entries = Object.entries(counts);
    if (entries.length === 0) return [];
    return entries
      .map(([key, count]) => ({
        key,
        label: key === '__none__' ? 'No study recorded' : key,
        count,
        isEmpty: key === '__none__',
      }))
      .sort((a, b) => {
        if (a.isEmpty && b.isEmpty) return 0;
        if (a.isEmpty) return 1;
        if (b.isEmpty) return -1;
        return a.label.localeCompare(b.label);
      });
  }, [summary.studyCounts]);
  return (
    <>
      <Head>
        <title>Call Logs - HSAPSS Windsor</title>
      </Head>
      <Navbar />

      <div className="container-fluid py-4 call-logs-page">
        <div className="d-flex flex-wrap align-items-start align-items-lg-center justify-content-between gap-3 mb-4">
          <div>
            <h1 className="h3 mb-1">Call Logs</h1>
            <p className="text-muted mb-0">Track outreach history, follow-ups, and recent call activity.</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Button variant="primary" onClick={handleAddCallLog}>
              <i className="fas fa-plus me-2"></i>
              Add Call Log
            </Button>
            <Button variant="success" onClick={handleOpenMessageModal}>
              <i className="fab fa-whatsapp me-2"></i>
              WhatsApp Message
            </Button>
            <Button variant="danger" onClick={handleBulkDelete} disabled={selectedRows.length === 0}>
              <i className="fas fa-trash me-2"></i>
              Delete Selected
            </Button>
            <Button variant="outline-secondary" onClick={() => setShowRecent(true)}>
              <i className="fas fa-clock me-2"></i>
              View Recent Calls
            </Button>
            <Button variant="outline-danger" onClick={handleDeleteLastDialed} disabled={!recentLogs.length}>
              <i className="fas fa-phone-slash me-2"></i>
              Delete Last Dialed
            </Button>
          </div>
        </div>

        <Row className="gy-3 gx-3 mb-4">
          <Col xs={12} md={6} xl={3}>
            <div className="card stat-card shadow-sm border-0 h-100">
              <div className="card-body">
                <small className="text-muted text-uppercase fw-semibold">Total Calls</small>
                <div className="stat-value mt-2">{totalRows}</div>
                <div className="text-muted small">Last activity {lastActivityText}</div>
              </div>
            </div>
          </Col>
          <Col xs={12} md={6} xl={3}>
            <div className="card stat-card shadow-sm border-0 h-100">
              <div className="card-body">
                <small className="text-muted text-uppercase fw-semibold">Completed</small>
                <div className="stat-value mt-2">{completedCount}</div>
                <div className="text-muted small">Calls resolved</div>
              </div>
            </div>
          </Col>
          <Col xs={12} md={6} xl={3}>
            <div className="card stat-card shadow-sm border-0 h-100">
              <div className="card-body">
                <small className="text-muted text-uppercase fw-semibold">No Answer</small>
                <div className="stat-value mt-2">{noAnswerCount}</div>
                <div className="text-muted small">Needs another attempt</div>
              </div>
            </div>
          </Col>
          <Col xs={12} md={6} xl={3}>
            <div className="card stat-card shadow-sm border-0 h-100">
              <div className="card-body">
                <small className="text-muted text-uppercase fw-semibold">Follow-ups</small>
                <div className="stat-value mt-2">{followUpsDue}</div>
                <div className="text-muted small">Overdue {overdueFollowUps}</div>
              </div>
            </div>
          </Col>
        </Row>

        <div className="card filter-card shadow-sm border-0 sticky-filters mb-4">
          <div className="card-body">
            <div className="d-flex flex-column flex-lg-row gap-3 align-items-stretch align-items-lg-center justify-content-between">
              <InputGroup className="search-input flex-grow-1">
                <span className="input-group-text bg-white border-end-0">
                  <i className="fas fa-search text-muted"></i>
                </span>
                <Form.Control
                  type="text"
                  placeholder="Search by student, notes, status..."
                  value={searchInput}
                  onChange={handleSearch}
                />
              </InputGroup>
              <div className="d-flex gap-2 justify-content-end">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setShowFilters((prev) => !prev)}
                >
                  <i className="fas fa-sliders-h me-2"></i>
                  {showFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={handleResetFilters}
                  disabled={!hasActiveFilters}
                >
                  <i className="fas fa-eraser me-2"></i>
                  Clear Filters
                </Button>
              </div>
            </div>

            {showFilters && (
              <Row className="gy-3 gx-3 mt-3 align-items-end">
                <Col md={3}>
                  <Form.Label className="text-muted small fw-semibold text-uppercase">Status</Form.Label>
                  <Form.Select
                    value={filter.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="">All statuses</option>
                    {CALL_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label className="text-muted small fw-semibold text-uppercase">Reason</Form.Label>
                  <Form.Select
                    value={filter.reason}
                    onChange={(e) => handleFilterChange('reason', e.target.value)}
                  >
                    <option value="">All reasons</option>
                    {CALL_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label className="text-muted small fw-semibold text-uppercase">Study</Form.Label>
                  <Form.Select
                    value={filter.study}
                    onChange={(e) => handleFilterChange('study', e.target.value)}
                  >
                    <option value="">All studies</option>
                    {studyOptions.map((value) => (
                      <option key={value || 'none'} value={value}>
                        {value === '__none__' ? 'No study recorded' : value}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label className="text-muted small fw-semibold text-uppercase">Student</Form.Label>
                  <Form.Select
                    value={filter.student}
                    onChange={(e) => handleFilterChange('student', e.target.value)}
                  >
                    <option value="">All students</option>
                    {students.map((student) => (
                      <option key={student._id} value={student._id}>
                        {student.first_name} {student.last_name}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label className="text-muted small fw-semibold text-uppercase">Follow-up focus</Form.Label>
                  <Form.Check
                    type="switch"
                    id="recentOnly"
                    label="Recent calls only (7 days)"
                    checked={filter.recentOnly}
                    onChange={(e) => handleFilterChange('recentOnly', e.target.checked)}
                  />
                </Col>
                <Col md={3}>
                  <Form.Label className="text-muted small fw-semibold text-uppercase">Sort by</Form.Label>
                  <Form.Select
                    value={filter.sort}
                    onChange={(e) => handleFilterChange('sort', e.target.value)}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label className="text-muted small fw-semibold text-uppercase">Date From</Form.Label>
                  <Form.Control
                    type="date"
                    value={filter.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </Col>
                <Col md={3}>
                  <Form.Label className="text-muted small fw-semibold text-uppercase">Date To</Form.Label>
                  <Form.Control
                    type="date"
                    value={filter.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </Col>
              </Row>
            )}
          </div>
        </div>

        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body d-flex flex-wrap align-items-center gap-3">
            <span className="text-uppercase text-muted small fw-semibold">Reason distribution</span>
            {reasonMetrics.map(([reason, count]) => {
              const meta = getReasonMeta(reason);
              return (
                <div key={reason} className="reason-pill">
                  <span className={`reason-dot bg-${meta.variant}`}></span>
                  <span className="fw-semibold text-dark">{count}</span>
                  <span className="text-muted small">{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body d-flex flex-wrap align-items-center gap-3">
            <span className="text-uppercase text-muted small fw-semibold">Study overview</span>
            {studyMetrics.length === 0 ? (
              <span className="text-muted small">No study data available yet.</span>
            ) : (
              studyMetrics.map((item) => (
                <div key={item.key} className="reason-pill">
                  <span className="fw-semibold text-dark">{item.count}</span>
                  <span className="text-muted small">{item.label}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card shadow-sm border-0">
          <div className="card-body">
            <div className="data-table-wrapper">
              <DataTable
                columns={columns}
                data={callLogs}
                customStyles={tableStyles}
                progressPending={loading}
                progressComponent={
                  <div className="py-5 text-center">
                    <Spinner animation="border" variant="primary" />
                    <div className="mt-3 text-muted">Loading call logs...</div>
                  </div>
                }
                noDataComponent={
                  <div className="py-5 text-center">
                    <i className="fas fa-clipboard-list fa-2x text-muted mb-3"></i>
                    <p className="mb-1 fw-semibold">No call logs match your filters</p>
                    <p className="text-muted small mb-0">Adjust filters or add a new call log to get started.</p>
                  </div>
                }
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
                selectableRowsHighlight
                onSelectedRowsChange={({ selectedRows }) => setSelectedRows(selectedRows)}
                clearSelectedRows={clearSelectedRowsToggle}
                highlightOnHover
                persistTableHead
              />
            </div>
          </div>
        </div>
      </div>
      {/* WhatsApp Message Modal */}
      <Modal show={showMessageModal} onHide={handleCloseMessageModal} size="lg" contentClassName="solid-modal">
        <Modal.Header closeButton>
          <Modal.Title>WhatsApp Broadcast</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <Form.Check
              type="radio"
              id="sendToAll"
              name="recipientMode"
              label={`Send to all students (${students.length})`}
              checked={sendToAll}
              onChange={() => {
                setSendToAll(true);
                setSelectedRecipients([]);
              }}
            />
            <Form.Check
              type="radio"
              id="sendToSpecific"
              name="recipientMode"
              className="mt-2"
              label="Send to selected students"
              checked={!sendToAll}
              onChange={() => setSendToAll(false)}
            />
          </div>

          {!sendToAll && (
            <div className="mb-3">
              <Form.Label className="fw-semibold small text-uppercase text-muted">Add recipients</Form.Label>
              <InputGroup className="mb-2">
                <span className="input-group-text bg-white border-end-0">
                  <i className="fas fa-search text-muted"></i>
                </span>
                <Form.Control
                  type="text"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder="Search by name, phone, or study"
                />
              </InputGroup>
              <div className="recipient-search-results">
                {filteredRecipients.length === 0 ? (
                  <div className="small text-muted">No matches.</div>
                ) : (
                  filteredRecipients.map((student) => (
                    <Button
                      key={student._id}
                      variant="outline-secondary"
                      size="sm"
                      className="me-2 mb-2"
                      onClick={() => handleAddRecipient(student)}
                    >
                      <i className="fas fa-plus me-1"></i>
                      {formatStudentName(student)}
                    </Button>
                  ))
                )}
              </div>
              {selectedRecipientsSorted.length > 0 && (
                <div className="mt-3">
                  <div className="small text-muted text-uppercase fw-semibold mb-2">Selected</div>
                  <div className="d-flex flex-wrap gap-2">
                    {selectedRecipientsSorted.map((student) => (
                      <Button
                        key={student._id}
                        variant="outline-primary"
                        size="sm"
                        className="d-flex align-items-center gap-2"
                        onClick={() => handleRemoveRecipient(student._id)}
                      >
                        {formatStudentName(student)}
                        <i className="fas fa-times"></i>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label className="text-muted small fw-semibold text-uppercase">Message</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type the WhatsApp message to send"
            />
            <Form.Text muted>{messageText.trim().length} characters</Form.Text>
          </Form.Group>

          <div className="alert alert-info small" role="alert">
            We will open a WhatsApp chat window per recipient. Review and send each message directly in WhatsApp.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseMessageModal} disabled={messageSending}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSendWhatsAppMessage}
            disabled={messageSending || (!sendToAll && selectedRecipients.length === 0)}
          >
            <i className="fab fa-whatsapp me-2"></i>
            {messageSending ? 'Preparing...' : 'Open WhatsApp'}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Add Call Log Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} contentClassName="solid-modal">
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
                {CALL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
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
                {CALL_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
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
                placeholder="What was discussed? Any outcomes or next steps?"
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
                value={
                  callLog.timestamp
                    ? new Date(callLog.timestamp).toISOString().slice(0, 16)
                    : ''
                }
                onChange={(e) =>
                  setCallLog({
                    ...callLog,
                    timestamp: e.target.value ? new Date(e.target.value).toISOString() : '',
                  })
                }
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
                <div className="fw-semibold">
                  {log.student ? formatStudentName(log.student) : 'Unknown'}
                </div>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  <Badge bg={getStatusMeta(log.status).variant} className="rounded-pill">
                    {getStatusMeta(log.status).label}
                  </Badge>
                  <Badge bg={getReasonMeta(log.call_reason).variant} className="rounded-pill">
                    {getReasonMeta(log.call_reason).label}
                  </Badge>
                  {log.needs_follow_up && log.follow_up_date && (
                    <Badge
                      bg={new Date(log.follow_up_date) < new Date() ? 'danger' : 'warning'}
                      className="rounded-pill"
                    >
                      Follow-up {formatDateOnly(log.follow_up_date)}
                    </Badge>
                  )}
                </div>
                <div className="small text-muted mt-2">
                  {log.timestamp ? formatDateTime(log.timestamp) : ''}
                </div>
                <div className="text-muted mt-2">{log.notes || 'No notes'}</div>
              </div>
            ))
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Toast Notification */}
      <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1051 }}>
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={2500}
          autohide
          bg={toastVariant === 'success' ? 'success' : 'danger'}
        >
          <Toast.Body className="text-white fw-semibold">{toastMessage}</Toast.Body>
        </Toast>
      </div>

      <style jsx global>{`
        .call-logs-page .stat-card {
          border: 1px solid #e4e8f0;
          border-radius: 1rem;
          background: #ffffff;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        .call-logs-page .stat-card:hover {
          box-shadow: 0 12px 25px rgba(38, 63, 118, 0.08);
          transform: translateY(-2px);
        }
        .call-logs-page .stat-value {
          font-size: 2rem;
          font-weight: 600;
          color: #1f2a37;
          line-height: 1.2;
        }
        .call-logs-page .filter-card {
          border-radius: 1rem;
          border: 1px solid #e7eaf3;
          background: #f8f9fb;
        }
        .call-logs-page .filter-card .form-control,
        .call-logs-page .filter-card .form-select {
          border-radius: 0.75rem;
        }
        .call-logs-page .sticky-filters {
          position: sticky;
          top: 72px;
          z-index: 1020;
        }
        .call-logs-page .reason-pill {
          border-radius: 999px;
          background: #f1f5f9;
          padding: 0.35rem 0.75rem;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
        }
        .call-logs-page .reason-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }
        .call-logs-page .reason-dot.bg-secondary {
          background-color: #6c757d !important;
        }
        .call-logs-page .reason-dot.bg-primary {
          background-color: #0d6efd !important;
        }
        .call-logs-page .reason-dot.bg-info {
          background-color: #0dcaf0 !important;
        }
        .call-logs-page .reason-dot.bg-dark {
          background-color: #343a40 !important;
        }
        .avatar-circle {
          width: 36px;
          height: 36px;
          background: #e7eaf3;
          color: #233;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1rem;
        }
        .call-logs-page .data-table-wrapper {
          overflow-x: auto;
        }
        .call-logs-page .dataTable table {
          font-size: 0.95rem;
        }
        .recipient-search-results {
          max-height: 220px;
          overflow-y: auto;
        }
        .recipient-search-results .btn {
          white-space: nowrap;
        }
        @media (max-width: 576px) {
          .call-logs-page .stat-card {
            border-radius: 0.85rem;
          }
          .call-logs-page .filter-card {
            padding: 0.75rem !important;
          }
        }
        @media (max-width: 1200px) {
          .call-logs-page .sticky-filters {
            position: static !important;
            top: auto !important;
            z-index: auto !important;
            margin-bottom: 1.5rem;
          }
        }
      `}</style>
    </>
  );
}

























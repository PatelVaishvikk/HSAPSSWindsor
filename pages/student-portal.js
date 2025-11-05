import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  Spinner,
  Offcanvas,
  ListGroup,
  OverlayTrigger,
  Tooltip,
  Toast,
  ToastContainer
} from 'react-bootstrap';
import { io } from 'socket.io-client';
import { STUDENT_PORTAL_FIELD_DEFS, STUDENT_PORTAL_FIELD_NAMES } from '../config/studentPortalFields.js';

const DEFAULT_PASSWORD = 'dasnadas';

const passwordHint =
  'Use the password you created. First time here? Choose "Create Account" to register with your phone number.';

const INSTITUTION_OPTIONS = [
  { value: 'uwindsor', label: 'University of Windsor' },
  { value: 'st_clair', label: 'St. Clair College' },
  { value: 'other', label: 'Other' }
];

const PROGRAM_LIBRARY = {
  uwindsor: [
    { value: 'masters_applied_computing', label: 'Masters of Applied Computing', level: 'masters' },
    {
      value: 'meng',
      label: 'Master of Engineering (MEng)',
      level: 'meng',
      specializations: ['Civil', 'ECE', 'Mechanical', 'Automobile']
    },
    { value: 'mba', label: 'MBA', level: 'mba' },
    { value: 'msc', label: 'MSc', level: 'msc' },
    { value: 'uwindsor_other', label: 'Other Windsor Program', level: 'other' }
  ],
  st_clair: [
    { value: 'pg_business', label: 'Business', level: 'pg_diploma' },
    { value: 'pg_international_business_management', label: 'International Business Management', level: 'pg_diploma' },
    { value: 'pg_data_analytics', label: 'Data Analytics', level: 'pg_diploma' },
    { value: 'pg_predictive_data_analytics', label: 'Predictive Data Analytics', level: 'pg_diploma' },
    { value: 'pg_cybersecurity', label: 'Cybersecurity & IT Security', level: 'pg_diploma' },
    { value: 'pg_supply_chain', label: 'Supply Chain Management & Logistics', level: 'pg_diploma' },
    { value: 'pg_construction_project_management', label: 'Construction Project Management', level: 'pg_diploma' },
    {
      value: 'pg_health_care',
      label: 'Health Care Programs',
      level: 'pg_diploma',
      specializations: ['Nursing', 'Medical Laboratory', 'Fitness & Health Promotion', 'Occupational Therapist Assistant']
    },
    {
      value: 'pg_engineering_technology',
      label: 'Engineering Technology',
      level: 'pg_diploma',
      specializations: ['Civil', 'Mechanical', 'Electrical', 'Biomedical']
    },
    {
      value: 'pg_skilled_trades',
      label: 'Skilled Trades',
      level: 'pg_diploma',
      specializations: ['Carpentry', 'Welding', 'Plumbing', 'Refrigeration', 'Greenhouse Technician', 'Landscape Horticulture']
    },
    { value: 'st_clair_other', label: 'Other St. Clair Program', level: 'pg_diploma' }
  ],
  other: [
    { value: 'other_program', label: 'Other Program', level: 'other' }
  ]
};

const FIELD_CONFIG_MAP = new Map(
  STUDENT_PORTAL_FIELD_DEFS.map((field) => [field.name, field])
);

const buildInitialFormState = () =>
  STUDENT_PORTAL_FIELD_NAMES.reduce((acc, field) => {
    const config = FIELD_CONFIG_MAP.get(field);
    acc[field] = config?.type === 'checkbox' ? false : '';
    return acc;
  }, {});

const getFieldColumnClass = (field) => {
  if (field.type === 'textarea') {
    return 'col-12';
  }
  if (field.type === 'checkbox') {
    return 'col-12 col-md-4';
  }
  if (['address', 'notes', 'study'].includes(field.name)) {
    return 'col-12';
  }
  if (field.type === 'date') {
    return 'col-12 col-md-6 col-xl-4';
  }
  return 'col-12 col-md-6';
};

const buildInitials = (first = '', last = '') => {
  const parts = [first, last].filter(Boolean);
  if (parts.length === 0) {
    return '';
  }
  return parts
    .map((part) => part.trim().charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};

const formatConversationTimestamp = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const diffMs = Date.now() - date.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  if (diffMs < minuteMs) {
    return 'Just now';
  }
  if (diffMs < hourMs) {
    return `${Math.floor(diffMs / minuteMs)}m ago`;
  }
  if (diffMs < dayMs) {
    return `${Math.floor(diffMs / hourMs)}h ago`;
  }
  return date.toLocaleDateString();
};

const formatPresenceText = (online, lastSeenIso) => {
  if (online) {
    return 'Online now';
  }
  if (!lastSeenIso) {
    return 'Offline';
  }
  const date = new Date(lastSeenIso);
  if (Number.isNaN(date.getTime())) {
    return 'Offline';
  }
  const diffMs = Date.now() - date.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  if (diffMs < minuteMs) {
    return 'Last seen just now';
  }
  if (diffMs < hourMs) {
    return `Last seen ${Math.floor(diffMs / minuteMs)}m ago`;
  }
  if (diffMs < dayMs) {
    return `Last seen ${Math.floor(diffMs / hourMs)}h ago`;
  }
  return `Last seen ${date.toLocaleDateString()}`;
};

export default function StudentPortalPage() {
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [student, setStudent] = useState(null);
  const [formData, setFormData] = useState(buildInitialFormState);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);
  const [sessionPassword, setSessionPassword] = useState('');
  const [portalMeta, setPortalMeta] = useState({
    has_custom_password: false,
    used_default_password: false
  });
  const [activePane, setActivePane] = useState('profile');
  const [communityProfiles, setCommunityProfiles] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState('');
  const [communitySearch, setCommunitySearch] = useState('');
  const [communityInitialized, setCommunityInitialized] = useState(false);
  const [inboxThreads, setInboxThreads] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState('');
  const [inboxInitialized, setInboxInitialized] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [showConversationPanel, setShowConversationPanel] = useState(false);
  const [helpRequests, setHelpRequests] = useState([]);
  const [helpScope, setHelpScope] = useState('open');
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpError, setHelpError] = useState('');
  const [helpSuccess, setHelpSuccess] = useState('');
  const [helpSubmitLoading, setHelpSubmitLoading] = useState(false);
  const [helpForm, setHelpForm] = useState({ title: '', description: '', tags: '' });
  const [responseDrafts, setResponseDrafts] = useState({});
  const [respondingRequestId, setRespondingRequestId] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const conversationEndRef = useRef(null);
  const socketRef = useRef(null);
  const activeConversationRef = useRef(null);
  const inboxThreadsRef = useRef([]);
  const helpScopeRef = useRef('open');
  const [toastQueue, setToastQueue] = useState([]);
  const [profilePreview, setProfilePreview] = useState(null);
  const [showProfilePreview, setShowProfilePreview] = useState(false);

  const enqueueToast = useCallback(
    ({ variant = 'primary', title, message, actionLabel, onAction }) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToastQueue((prev) => [
        ...prev,
        { id, variant, title, message, actionLabel, onAction }
      ]);
    },
    []
  );

  const dismissToast = useCallback((id) => {
    setToastQueue((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    inboxThreadsRef.current = inboxThreads;
  }, [inboxThreads]);

  useEffect(() => {
    helpScopeRef.current = helpScope;
  }, [helpScope]);

  const graduationComplete = formData.graduation_completed || false;
  const workingPlan = formData.post_graduation_plan === 'working';

  const portalSections = useMemo(
    () => [
      {
        key: 'contact',
        icon: 'fas fa-id-card',
        title: 'Contact Information',
        subtitle: 'Keep your contact details and emergency info up to date.',
        fields: ['first_name', 'last_name', 'mail_id', 'phone', 'gender', 'address', 'emergency_contact']
      },
      {
        key: 'academic',
        icon: 'fas fa-graduation-cap',
        title: 'Academic Journey',
        subtitle: 'Let us know where and what you are studying.',
        fields: [
          'date_of_birth',
          'education',
          'study_institution',
          'study_program',
          'study_specialization',
          'study_level',
          'study'
        ]
      },
      {
        key: 'career',
        icon: 'fas fa-briefcase',
        title: 'Graduation & Career Plans',
        subtitle: 'Share your graduation status and next steps after school.',
        fields: [
          'graduation_completed',
          'graduation_date',
          'post_graduation_plan',
          'employment_status',
          'employment_company',
          'employment_role',
          'notes'
        ]
      },
      {
        key: 'professional',
        icon: 'fas fa-network-wired',
        title: 'Professional Presence',
        subtitle: 'Let your peers know how to collaborate and connect with you.',
        fields: [
          'community_visibility',
          'community_headline',
          'community_bio',
          'community_skills',
          'community_interests',
          'available_to_help',
          'help_offering',
          'linkedin_url',
          'portfolio_url'
        ]
      }
    ],
    []
  );

  const portalViews = useMemo(
    () => [
      { key: 'profile', label: 'My Profile', icon: 'fas fa-id-card' },
      { key: 'community', label: 'Community', icon: 'fas fa-users' },
      { key: 'help', label: 'Help Board', icon: 'fas fa-hands-helping' },
      { key: 'account', label: 'Account', icon: 'fas fa-lock' }
    ],
    []
  );

  const institutionOptions = useMemo(() => {
    const base = [...INSTITUTION_OPTIONS];
    if (
      formData.study_institution &&
      !base.some((option) => option.value === formData.study_institution)
    ) {
      base.push({
        value: formData.study_institution,
        label: formData.study_institution
      });
    }
    return base;
  }, [formData.study_institution]);

  const availablePrograms = useMemo(
    () => PROGRAM_LIBRARY[formData.study_institution] || [],
    [formData.study_institution]
  );

  const selectedProgramDefinition = useMemo(
    () => availablePrograms.find((program) => program.value === formData.study_program) || null,
    [availablePrograms, formData.study_program]
  );

  const programOptions = useMemo(() => {
    const base = [...availablePrograms];
    if (formData.study_program && !base.some((program) => program.value === formData.study_program)) {
      base.push({
        value: formData.study_program,
        label: formData.study_program
      });
    }
    return base;
  }, [availablePrograms, formData.study_program]);

  const specializationOptions = useMemo(() => {
    const programDefinition = availablePrograms.find(
      (program) => program.value === formData.study_program
    );
    const base =
      programDefinition?.specializations?.map((name) => ({
        value: name,
        label: name
      })) || [];

    if (
      formData.study_specialization &&
      !base.some((option) => option.value === formData.study_specialization)
    ) {
      base.push({
        value: formData.study_specialization,
        label: formData.study_specialization
      });
    }

    return base;
  }, [availablePrograms, formData.study_program, formData.study_specialization]);

  const studySummary = useMemo(() => {
    const parts = [];
    if (selectedProgramDefinition) {
      parts.push(selectedProgramDefinition.label);
    } else if (formData.study_program) {
      parts.push(formData.study_program);
    }
    if (formData.study_specialization) {
      parts.push(formData.study_specialization);
    }
    return parts.join(' - ');
  }, [selectedProgramDefinition, formData.study_program, formData.study_specialization]);

  const totalUnreadMessages = useMemo(
    () => inboxThreads.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0),
    [inboxThreads]
  );

  const openHelpCount = useMemo(
    () => helpRequests.filter((request) => request.status === 'open').length,
    [helpRequests]
  );

  const communityCount = communityProfiles.length;

  const portalAuthHeaders = useMemo(() => {
    if (!student?._id || !sessionPassword) {
      return null;
    }
    return {
      'X-Student-Id': student._id,
      'X-Portal-Secret': sessionPassword
    };
  }, [student?._id, sessionPassword]);

  const refreshCommunityProfiles = useCallback(
    async (searchValue = communitySearch) => {
      if (!portalAuthHeaders) {
        setCommunityError('Session expired. Please log in again.');
        return;
      }

      setCommunityLoading(true);
      setCommunityError('');

      try {
        const params = new URLSearchParams();
        if (searchValue && searchValue.trim()) {
          params.set('search', searchValue.trim());
        }
        const query = params.toString();
        const response = await fetch(
          `/api/student-portal/community${query ? `?${query}` : ''}`,
          {
            method: 'GET',
            headers: portalAuthHeaders
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Unable to load community right now.');
        }
        setCommunityProfiles(Array.isArray(data.profiles) ? data.profiles : []);
        setCommunityInitialized(true);
      } catch (error) {
        console.error('Student community fetch failed:', error);
        setCommunityError(error.message || 'Unable to load community right now.');
      } finally {
        setCommunityLoading(false);
      }
    },
    [communitySearch, portalAuthHeaders]
  );

  const refreshInboxThreads = useCallback(
    async () => {
      if (!portalAuthHeaders) {
        return;
      }

      setInboxLoading(true);
      setInboxError('');

      try {
        const response = await fetch('/api/student-portal/messages?limit=12', {
          method: 'GET',
          headers: portalAuthHeaders
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Unable to load conversations');
        }
        const threads = Array.isArray(data.inbox) ? data.inbox : [];
        setInboxThreads(threads);
        inboxThreadsRef.current = threads;
        setInboxInitialized(true);
      } catch (error) {
        console.error('Student inbox fetch failed:', error);
        setInboxError(error.message || 'Unable to load conversations');
      } finally {
        setInboxLoading(false);
      }
    },
    [portalAuthHeaders]
  );

  const openConversationWithStudent = useCallback(
    async (target, presetMessage = '') => {
      const base = target?.student || target || {};
      const targetId = base.id;
      if (!targetId) {
        return;
      }

      setShowConversationPanel(true);
      setConversationMessages([]);
      setConversationError('');
      setMessageDraft(presetMessage);
    setActiveConversation({
      id: targetId,
      first_name: base.first_name || '',
      last_name: base.last_name || '',
      study: base.study || '',
      community_headline: base.community_headline || '',
      available_to_help: Boolean(base.available_to_help),
      help_offering: base.help_offering || '',
      online: Boolean(base.online),
      last_seen: base.last_seen || null
    });

      if (!portalAuthHeaders) {
        setConversationError('Session expired. Please log in again.');
        setConversationLoading(false);
        return;
      }

      setConversationLoading(true);

      try {
        const response = await fetch(`/api/student-portal/messages?with=${targetId}`, {
          method: 'GET',
          headers: portalAuthHeaders
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Unable to load conversation');
        }

        if (data.partner) {
        setActiveConversation({
          id: data.partner.id,
          first_name: data.partner.first_name || '',
          last_name: data.partner.last_name || '',
          study: data.partner.study || '',
          community_headline: data.partner.community_headline || '',
          available_to_help: Boolean(data.partner.available_to_help),
          help_offering: data.partner.help_offering || '',
          online: Boolean(data.partner.online),
          last_seen: data.partner.last_seen || null
        });
        }

        setConversationMessages(Array.isArray(data.conversation) ? data.conversation : []);
        setConversationError('');
        setTimeout(() => {
          if (conversationEndRef.current) {
            conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 30);
        refreshInboxThreads();
      } catch (error) {
        console.error('Conversation fetch failed:', error);
        setConversationError(error.message || 'Unable to load conversation');
      } finally {
        setConversationLoading(false);
      }
    },
    [portalAuthHeaders, refreshInboxThreads]
  );

  const openFirstConversation = useCallback(() => {
    if (inboxThreads.length > 0) {
      openConversationWithStudent(inboxThreads[0]);
    } else {
      setShowConversationPanel(true);
    }
  }, [inboxThreads, openConversationWithStudent]);

  const refreshHelpRequests = useCallback(
    async (scopeValue = helpScope) => {
      if (!portalAuthHeaders) {
        return;
      }

      setHelpLoading(true);
      setHelpError('');

      try {
        const params = new URLSearchParams();
        params.set('scope', scopeValue);
        const response = await fetch(
          `/api/student-portal/help-requests?${params.toString()}`,
          {
            method: 'GET',
            headers: portalAuthHeaders
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Unable to load help board right now.');
        }
        setHelpRequests(Array.isArray(data.requests) ? data.requests : []);
        setHelpScope(scopeValue);
      } catch (error) {
        console.error('Student help board fetch failed:', error);
        setHelpError(error.message || 'Unable to load help board right now.');
      } finally {
        setHelpLoading(false);
      }
    },
    [helpScope, portalAuthHeaders]
  );

  const handleIncomingMessage = useCallback(
    (payload = {}) => {
      const message = payload.message;
      if (!message) {
        return;
      }
      const viewerId = student?._id ? student._id.toString() : '';
      const senderId = message.sender?.id || '';
      const recipientId = message.recipient?.id || '';
      const partnerId = senderId === viewerId ? recipientId : senderId;

      if (activeConversationRef.current?.id === partnerId && partnerId) {
        setConversationMessages((prev) => [...prev, message]);
        setActiveConversation((prev) =>
          prev
            ? {
                ...prev,
                online: senderId !== viewerId ? true : prev.online,
                last_seen: new Date().toISOString()
              }
            : prev
        );
      }

      refreshInboxThreads();

      if (!partnerId || activeConversationRef.current?.id === partnerId) {
        return;
      }

      const snippet =
        message.body && message.body.length > 140
          ? `${message.body.slice(0, 137)}...`
          : message.body;

      enqueueToast({
        variant: 'primary',
        title: message.sender?.name ? `Message from ${message.sender.name}` : 'New message',
        message: snippet,
        actionLabel: 'Open chat',
        onAction: () =>
          setTimeout(() => {
            setActivePane('community');
            openConversationWithStudent({
              id: partnerId,
              first_name: message.sender?.name?.split(' ')[0] || 'Friend',
              last_name: message.sender?.name?.split(' ').slice(1).join(' ') || '',
              study: '',
              community_headline: ''
            });
          }, 0)
      });
    },
    [enqueueToast, openConversationWithStudent, refreshInboxThreads, setActivePane, student?._id]
  );

  const handleConversationEvent = useCallback(
    (payload = {}) => {
      if (payload.type !== 'conversation:cleared') {
        return;
      }
      if (payload.studentId && activeConversationRef.current?.id === payload.studentId) {
        setConversationMessages([]);
        setActiveConversation((prev) =>
          prev
            ? {
                ...prev,
                online: false,
                last_seen: new Date().toISOString()
              }
            : prev
        );
      }
      refreshInboxThreads();
    },
    [refreshInboxThreads]
  );

  const handleRealtimeHelpUpdate = useCallback(
    (payload = {}) => {
      const request = payload.request;
      const viewerId = student?._id ? student._id.toString() : '';
      const scopeToRefresh = payload.scope || helpScopeRef.current || 'open';
      refreshHelpRequests(scopeToRefresh);

      if (!request) {
        return;
      }

      const ownerId = request.student?.id;

      if (payload.type === 'request:new' && ownerId && ownerId !== viewerId) {
        enqueueToast({
          variant: 'info',
          title: 'New help request',
          message: request.title,
          actionLabel: 'View board',
          onAction: () => setActivePane('help')
        });
      }

      if (payload.type === 'request:response' && ownerId && ownerId === viewerId) {
        enqueueToast({
          variant: 'success',
          title: 'New response received',
          message: `Someone replied to "${request.title}"`,
          actionLabel: 'Open board',
          onAction: () => setActivePane('help')
        });
      }
    },
    [enqueueToast, refreshHelpRequests, setActivePane, student?._id]
  );

  useEffect(() => {
    if (!student?._id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io();
    socketRef.current = socket;

    socket.emit('student:join', { studentId: student._id });
    socket.emit('help:join', { studentId: student._id });

    socket.on('community:message', handleIncomingMessage);
    socket.on('community:message:sent', () => refreshInboxThreads());
    socket.on('community:conversation', handleConversationEvent);
    socket.on('help:update', handleRealtimeHelpUpdate);

    refreshInboxThreads();
    refreshHelpRequests(helpScopeRef.current || 'open');

    return () => {
      socket.off('community:message', handleIncomingMessage);
      socket.off('community:message:sent');
      socket.off('community:conversation', handleConversationEvent);
      socket.off('help:update', handleRealtimeHelpUpdate);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [student?._id, handleIncomingMessage, handleConversationEvent, handleRealtimeHelpUpdate, refreshHelpRequests, refreshInboxThreads]);

  const handleSendConversationMessage = async (event) => {
    event.preventDefault();
    if (!activeConversation?.id) {
      setConversationError('Select someone to message.');
      return;
    }

    const draft = messageDraft.trim();
    if (!draft) {
      return;
    }

    if (!portalAuthHeaders) {
      setConversationError('Session expired. Please log in again.');
      return;
    }

    try {
      const response = await fetch('/api/student-portal/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...portalAuthHeaders
        },
        body: JSON.stringify({
          recipientId: activeConversation.id,
          message: draft
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to send message');
      }

      const newMessage = {
        id: data.message?.id || `temp-${Date.now()}`,
        sender: {
          id: student?._id || '',
          name: `${student?.first_name || ''} ${student?.last_name || ''}`.trim()
        },
        recipient: {
          id: activeConversation.id,
          name: `${activeConversation.first_name || ''} ${activeConversation.last_name || ''}`.trim()
        },
        body: draft,
        created_at: data.message?.created_at || new Date().toISOString(),
        read: false
      };

      setConversationMessages((prev) => [...prev, newMessage]);
      setMessageDraft('');
      setConversationError('');
      setTimeout(() => {
        if (conversationEndRef.current) {
          conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 30);
      refreshInboxThreads();
      setActiveConversation((prev) =>
        prev
          ? {
              ...prev,
              last_seen: new Date().toISOString()
            }
          : prev
      );
    } catch (error) {
      console.error('Send conversation message failed:', error);
      setConversationError(error.message || 'Unable to send message');
    }
  };

  const handleClearConversation = async () => {
    if (!activeConversation?.id) {
      return;
    }
    if (!portalAuthHeaders) {
      setConversationError('Session expired. Please log in again.');
      return;
    }
    setConversationError('');
    try {
      const response = await fetch(`/api/student-portal/messages?with=${activeConversation.id}`, {
        method: 'DELETE',
        headers: portalAuthHeaders
      });
      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to clear conversation');
      }
      setConversationMessages([]);
      enqueueToast({
        variant: 'info',
        title: 'Conversation cleared',
        message: `History with ${activeConversation.first_name || 'this student'} has been cleared.`
      });
      setMessageDraft('');
      refreshInboxThreads();
    } catch (error) {
      console.error('Clear conversation failed:', error);
      setConversationError(error.message || 'Unable to clear conversation');
    }
  };

  const handleCloseConversation = () => {
    setShowConversationPanel(false);
    setActiveConversation(null);
    setConversationMessages([]);
    setMessageDraft('');
    setConversationError('');
  };

  const openProfilePreview = useCallback((profile) => {
    if (!profile) {
      return;
    }
    setProfilePreview(profile);
    setShowProfilePreview(true);
  }, []);

  const closeProfilePreview = useCallback(() => {
    setShowProfilePreview(false);
    setProfilePreview(null);
  }, []);

  useEffect(() => {
    if (student && activePane === 'community') {
      if (!communityInitialized && !communityLoading) {
        refreshCommunityProfiles();
      }
      if (!inboxInitialized && !inboxLoading) {
        refreshInboxThreads();
      }
    }
  }, [
    student,
    activePane,
    communityInitialized,
    communityLoading,
    inboxInitialized,
    inboxLoading,
    refreshCommunityProfiles,
    refreshInboxThreads
  ]);

  useEffect(() => {
    if (student && activePane === 'help' && helpRequests.length === 0 && !helpLoading) {
      refreshHelpRequests('open');
    }
  }, [student, activePane, helpRequests.length, helpLoading, refreshHelpRequests]);

  useEffect(() => {
    if (showConversationPanel && conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationMessages, showConversationPanel]);

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGraduationToggle = (checked) => {
    setFormData((prev) => ({
      ...prev,
      graduation_completed: checked,
      graduation_date: checked ? prev.graduation_date : ''
    }));
  };

  const handlePostGradPlanChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      post_graduation_plan: value,
      employment_status: value,
      employment_company: value === 'working' ? prev.employment_company : '',
      employment_role: value === 'working' ? prev.employment_role : ''
    }));
  };

  const handleInstitutionChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      study_institution: value,
      study_program: '',
      study_specialization: '',
      study_level: '',
      study: ''
    }));
  };

  const handleProgramChange = (event) => {
    const value = event.target.value;
    const programDefinition = availablePrograms.find((program) => program.value === value) || null;
    const derivedLevel = programDefinition?.level || '';
    setFormData((prev) => {
      const nextSpecialization = programDefinition?.specializations?.includes(prev.study_specialization)
        ? prev.study_specialization
        : '';
      return {
        ...prev,
        study_program: value,
        study_specialization: nextSpecialization,
        study_level: derivedLevel || prev.study_level,
        education: prev.education || derivedLevel || '',
        study: ''
      };
    });
  };

  const handleSpecializationChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      study_specialization: value,
      study: ''
    }));
  };

  const handleCommunitySearchSubmit = async (event) => {
    event.preventDefault();
    await refreshCommunityProfiles(communitySearch);
  };

  const handleHelpFieldChange = (name, value) => {
    setHelpForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleHelpRequestSubmit = async (event) => {
    event.preventDefault();
    if (!portalAuthHeaders) {
      setHelpError('Session expired. Please log in again.');
      return;
    }

    const trimmedTitle = helpForm.title.trim();
    if (!trimmedTitle) {
      setHelpError('Please enter a title for your help request.');
      return;
    }

    setHelpError('');
    setHelpSuccess('');
    setHelpSubmitLoading(true);

    try {
      const response = await fetch('/api/student-portal/help-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(portalAuthHeaders ?? {})
        },
        body: JSON.stringify({
          title: trimmedTitle,
          description: helpForm.description,
          tags: helpForm.tags
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to create help request right now.');
      }

      setHelpForm({ title: '', description: '', tags: '' });

      if (helpScope === 'open') {
        setHelpRequests((prev) => [data.request, ...prev]);
      } else {
        await refreshHelpRequests(helpScope);
      }

      setHelpSuccess('Your request has been posted for the community.');
    } catch (error) {
      console.error('Create help request failed:', error);
      setHelpError(error.message || 'Unable to create help request right now.');
    } finally {
      setHelpSubmitLoading(false);
    }
  };

  const handleHelpScopeChange = async (scopeValue) => {
    setHelpScope(scopeValue);
    await refreshHelpRequests(scopeValue);
  };

  const handleResponseDraftChange = (requestId, value) => {
    setResponseDrafts((prev) => ({
      ...prev,
      [requestId]: value
    }));
  };

  const handleRespondToRequest = async (requestId) => {
    if (!portalAuthHeaders) {
      setHelpError('Session expired. Please log in again.');
      return;
    }
    const message = (responseDrafts[requestId] || '').trim();
    if (!message) {
      setHelpError('Please share a quick message before offering help.');
      return;
    }

    setHelpError('');
    setHelpSuccess('');
    setRespondingRequestId(requestId);

    try {
      const response = await fetch('/api/student-portal/help-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(portalAuthHeaders ?? {})
        },
        body: JSON.stringify({
          requestId,
          action: 'respond',
          message
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to send your response right now.');
      }

      setResponseDrafts((prev) => ({
        ...prev,
        [requestId]: ''
      }));

      setHelpRequests((prev) =>
        prev.map((item) => (item.id === requestId ? data.request : item))
      );
      setHelpSuccess('Thank you for offering help! The student will see your response.');
    } catch (error) {
      console.error('Help response failed:', error);
      setHelpError(error.message || 'Unable to send your response right now.');
    } finally {
      setRespondingRequestId('');
    }
  };

  const handleCloseRequest = async (requestId) => {
    if (!portalAuthHeaders) {
      setHelpError('Session expired. Please log in again.');
      return;
    }

    setHelpError('');
    setHelpSuccess('');
    setRespondingRequestId(requestId);

    try {
      const response = await fetch('/api/student-portal/help-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(portalAuthHeaders ?? {})
        },
        body: JSON.stringify({
          requestId,
          action: 'close'
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to update the request right now.');
      }

      setHelpRequests((prev) =>
        prev.map((item) => (item.id === requestId ? data.request : item))
      );
      setHelpSuccess('Your request has been marked as resolved.');
    } catch (error) {
      console.error('Close help request failed:', error);
      const message = (error.message || '').trim();
      if (message === 'Only the owner can close a request') {
        setHelpError('Only the original author can close this request. Ask them to mark it resolved when they are all set.');
      } else {
        setHelpError(message || 'Unable to update the request right now.');
      }
    } finally {
      setRespondingRequestId('');
    }
  };

  const handlePasswordFieldChange = (field, value) => {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    if (!student?._id) {
      setPasswordError('Please log in again to update your password.');
      return;
    }

    setPasswordError('');
    setPasswordSuccess('');

    const current = passwordForm.current.trim();
    const next = passwordForm.next.trim();
    const confirm = passwordForm.confirm.trim();

    if (!current || !next || !confirm) {
      setPasswordError('Please complete all password fields.');
      return;
    }

    if (next !== confirm) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch('/api/student-portal/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: student._id,
          currentPassword: current,
          newPassword: next
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to update password right now.');
      }

      setPasswordForm({ current: '', next: '', confirm: '' });
      setPasswordSuccess('Your password has been updated. Use it the next time you log in.');
      setSessionPassword(next);
      setLoginPassword(next);
      setPortalMeta((prev) => ({
        ...prev,
        has_custom_password: true,
        used_default_password: false
      }));
  } catch (error) {
    console.error('Portal password update failed:', error);
    setPasswordError(error.message || 'Unable to update password right now.');
  } finally {
    setPasswordLoading(false);
  }
};

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setErrorMessage('');
    setSuccessMessage('');
    setLoginLoading(false);
    setRegisterLoading(false);
    if (mode === 'register') {
      setRegisterPhone((prev) => (prev ? prev : loginPhone));
      setRegisterPassword('');
      setRegisterConfirm('');
    } else {
      setLoginPassword('');
      if (registerPhone) {
        setLoginPhone(registerPhone);
      }
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoginLoading(true);

    try {
      const response = await fetch('/api/student-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loginPhone,
          password: loginPassword
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to log in');
      }

      const normalizedForm = buildInitialFormState();
      STUDENT_PORTAL_FIELD_NAMES.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(data.student, field)) {
          normalizedForm[field] =
            data.student[field] ?? (field === 'graduation_completed' ? false : '');
        }
      });

      setStudent(data.student);
      setFormData(normalizedForm);
      setSessionPassword(loginPassword);
      setPortalMeta({
        has_custom_password: Boolean(data.meta?.has_custom_password),
        used_default_password: Boolean(data.meta?.used_default_password)
      });
      setActivePane('profile');
      setCommunityProfiles([]);
      setCommunityInitialized(false);
      setHelpRequests([]);
      setHelpScope('open');
      setHelpSuccess('');
      setHelpError('');
      setShowThankYou(false);
      setSuccessMessage(
        'Welcome back! Update your details below and save your changes when you are done.'
      );
    } catch (error) {
      console.error('Student portal login failed:', error);
      const normalized = (error.message || '').trim();
      if (normalized === 'No student found with that phone number') {
        setErrorMessage(
          'We couldn\'t find a student with that phone number. Double-check the digits or choose "Create Account" if this is your first visit.'
        );
      } else {
        setErrorMessage(normalized || 'Login failed');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setRegisterLoading(true);

    try {
      const response = await fetch('/api/student-portal/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: registerPhone,
          password: registerPassword,
          confirmPassword: registerConfirm
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to register');
      }

      setSuccessMessage('Account created! You can now log in with your new password.');
      setLoginPhone(registerPhone);
      setLoginPassword(registerPassword);
      setAuthMode('login');
      setRegisterPhone('');
      setRegisterPassword('');
      setRegisterConfirm('');
    } catch (error) {
      console.error('Student portal registration failed:', error);
      setErrorMessage(error.message || 'Registration failed');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!student?._id) {
      setErrorMessage('Missing student information. Please refresh and log in again.');
      return;
    }
    if (!sessionPassword) {
      setErrorMessage('Your session has expired. Please log in again.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setUpdateLoading(true);

    const updates = {};
    STUDENT_PORTAL_FIELD_NAMES.forEach((field) => {
      switch (field) {
        case 'study': {
          updates[field] = studySummary || formData[field] || '';
          break;
        }
        case 'study_level': {
          const derivedLevel =
            selectedProgramDefinition?.level ||
            formData.study_level ||
            formData.education ||
            '';
          updates[field] = derivedLevel;
          break;
        }
        case 'education': {
          const derivedEducation = formData.education || selectedProgramDefinition?.level || '';
          updates[field] = derivedEducation;
          break;
        }
        case 'graduation_date': {
          updates[field] = graduationComplete ? formData[field] : '';
          break;
        }
        case 'employment_company':
        case 'employment_role': {
          updates[field] = workingPlan ? formData[field] : '';
          break;
        }
        case 'post_graduation_plan': {
          updates[field] = formData.post_graduation_plan || '';
          break;
        }
        case 'employment_status': {
          updates[field] = formData.employment_status || formData.post_graduation_plan || '';
          break;
        }
        default: {
          updates[field] = formData[field];
        }
      }
    });

    try {
      const response = await fetch('/api/student-portal/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student._id,
          password: sessionPassword,
          updates
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to update details');
      }

      const normalizedForm = buildInitialFormState();
      STUDENT_PORTAL_FIELD_NAMES.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(data.student, field)) {
          normalizedForm[field] =
            data.student[field] ?? (field === 'graduation_completed' ? false : '');
        }
      });

      setFormData(normalizedForm);
      setStudent(data.student);
      setSuccessMessage('');
      setShowThankYou(true);
      setCommunityInitialized(false);
    } catch (error) {
      console.error('Student portal update failed:', error);
      setErrorMessage(error.message || 'Update failed');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleLogout = () => {
    setStudent(null);
    setFormData(buildInitialFormState());
    setLoginPhone('');
    setLoginPassword(DEFAULT_PASSWORD);
    setSessionPassword('');
    setPortalMeta({
      has_custom_password: false,
      used_default_password: false
    });
    setActivePane('profile');
    setCommunityProfiles([]);
    setCommunityInitialized(false);
    setCommunitySearch('');
    setCommunityError('');
    setHelpRequests([]);
    setHelpScope('open');
    setHelpLoading(false);
    setHelpError('');
    setHelpSuccess('');
    setHelpForm({ title: '', description: '', tags: '' });
    setResponseDrafts({});
    setRespondingRequestId('');
    setPasswordForm({ current: '', next: '', confirm: '' });
    setPasswordLoading(false);
    setPasswordError('');
    setPasswordSuccess('');
    setErrorMessage('');
    setSuccessMessage('');
    setShowThankYou(false);
  };

  const renderFormControl = (field) => {
    const value =
      field.type === 'checkbox'
        ? Boolean(formData[field.name])
        : formData[field.name] ?? '';

    if (field.name === 'study_institution') {
      return (
        <Form.Group controlId={`student-portal-${field.name}`}>
          <Form.Label>{field.label}</Form.Label>
          <Form.Select value={formData.study_institution || ''} onChange={handleInstitutionChange}>
            <option value="">Select study institution</option>
            {institutionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      );
    }

    if (field.name === 'study_program') {
      const disabled = !formData.study_institution;
      return (
        <Form.Group controlId={`student-portal-${field.name}`}>
          <Form.Label>{field.label}</Form.Label>
          <Form.Select
            value={formData.study_program || ''}
            onChange={handleProgramChange}
            disabled={disabled}
          >
            <option value="">
              {disabled ? 'Select an institution first' : 'Select study program'}
            </option>
            {programOptions.map((program) => (
              <option key={program.value} value={program.value}>
                {program.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      );
    }

    if (field.name === 'study_specialization') {
      if (specializationOptions.length === 0) {
        return (
          <Form.Group controlId={`student-portal-${field.name}`}>
            <Form.Label>{field.label}</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter specialization (if applicable)"
              value={value}
              onChange={(event) => handleFieldChange(field.name, event.target.value)}
              disabled={!formData.study_program}
            />
          </Form.Group>
        );
      }

      return (
        <Form.Group controlId={`student-portal-${field.name}`}>
          <Form.Label>{field.label}</Form.Label>
          <Form.Select
            value={formData.study_specialization || ''}
            onChange={handleSpecializationChange}
            disabled={!formData.study_program}
          >
            <option value="">Select specialization</option>
            {specializationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      );
    }

    if (field.name === 'study') {
      const displayValue = studySummary || value;
      return (
        <Form.Group controlId={`student-portal-${field.name}`}>
          <Form.Label>{field.label}</Form.Label>
          <Form.Control
            type="text"
            value={displayValue}
            placeholder="Summary appears after selecting a program"
            readOnly
            plaintext={false}
          />
        </Form.Group>
      );
    }

    if (field.name === 'community_skills' || field.name === 'community_interests') {
      const example =
        field.name === 'community_skills'
          ? 'product design, Java, mentorship'
          : 'cricket, volunteering, hackathons';
      return (
        <Form.Group controlId={`student-portal-${field.name}`}>
          <Form.Label>{field.label}</Form.Label>
          <Form.Control
            type="text"
            placeholder={`Add comma-separated entries, e.g. ${example}`}
            value={value}
            onChange={(event) => handleFieldChange(field.name, event.target.value)}
          />
          <Form.Text className="text-muted small">
            Separate each item with a comma so others can find you by skill or interest.
          </Form.Text>
        </Form.Group>
      );
    }

    if (
      field.type === 'select' &&
      !['study_institution', 'study_program', 'study_specialization'].includes(field.name)
    ) {
      const options = field.options || [];
      const hasEmptyOption = options.some((option) => option.value === '');
      const handleSelectChange = (event) => {
        const nextValue = event.target.value;
        if (field.name === 'post_graduation_plan') {
          handlePostGradPlanChange(nextValue);
        } else {
          handleFieldChange(field.name, nextValue);
        }
      };

      return (
        <Form.Group controlId={`student-portal-${field.name}`}>
          <Form.Label>{field.label}</Form.Label>
          <Form.Select value={value || ''} onChange={handleSelectChange}>
            {!hasEmptyOption && <option value="">Select {field.label.toLowerCase()}</option>}
            {options.map((option) => (
              <option key={option.value || option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
          {field.name === 'community_visibility' && (
            <Form.Text className="text-muted small">
              Choose whether other HSAPSS students can see your profile in the community.
            </Form.Text>
          )}
        </Form.Group>
      );
    }

    if (field.type === 'checkbox') {
      const onToggle = (event) => {
        if (field.name === 'graduation_completed') {
          handleGraduationToggle(event.target.checked);
        } else {
          handleFieldChange(field.name, event.target.checked);
        }
      };

      return (
        <Form.Group controlId={`student-portal-${field.name}`} className="pt-2">
          <Form.Check type="switch" label={field.label} checked={value} onChange={onToggle} />
          {field.name === 'available_to_help' && (
            <Form.Text className="text-muted small">
              Turn this on if you are open to other students reaching out for support.
            </Form.Text>
          )}
        </Form.Group>
      );
    }

    if (field.type === 'textarea') {
      return (
        <Form.Group controlId={`student-portal-${field.name}`}>
          <Form.Label>{field.label}</Form.Label>
          <Form.Control
            as="textarea"
            rows={field.rows || 3}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            value={value}
            onChange={(event) => handleFieldChange(field.name, event.target.value)}
          />
        </Form.Group>
      );
    }

    const isGraduationDate = field.name === 'graduation_date';
    const isEmploymentField =
      field.name === 'employment_company' || field.name === 'employment_role';
    const isPhoneField = field.name === 'phone' || field.name === 'emergency_contact';
    const isHelpOffering = field.name === 'help_offering';

    const inputProps = {
      type: field.type || 'text',
      placeholder: `Enter ${field.label.toLowerCase()}`,
      value: value,
      onChange: (event) => handleFieldChange(field.name, event.target.value)
    };

    if (isGraduationDate) {
      inputProps.type = 'date';
      inputProps.disabled = !graduationComplete;
    }

    if (isEmploymentField) {
      inputProps.placeholder =
        field.name === 'employment_company'
          ? 'Where are you working?'
          : 'What is your role or title?';
      inputProps.disabled = !workingPlan;
    }

    if (isPhoneField) {
      inputProps.type = 'tel';
    }

    if (isHelpOffering) {
      inputProps.placeholder = 'Share the ways you are happy to support fellow students';
      inputProps.disabled = !formData.available_to_help;
    }

    return (
      <Form.Group controlId={`student-portal-${field.name}`}>
        <Form.Label>{field.label}</Form.Label>
        <Form.Control {...inputProps} />
        {isGraduationDate && !graduationComplete && (
          <Form.Text className="text-muted small">
            Toggle &quot;Graduation Completed&quot; to set a completion date.
          </Form.Text>
        )}
        {isEmploymentField && !workingPlan && (
          <Form.Text className="text-muted small">
            Select &quot;Working&quot; as your plan to add company and role details.
          </Form.Text>
        )}
        {isHelpOffering && !formData.available_to_help && (
          <Form.Text className="text-muted small">
            Enable &quot;Available to help&quot; to describe how others can reach out.
          </Form.Text>
        )}
      </Form.Group>
    );
  };

  const renderCommunityPane = () => (
    <div className="community-pane">
      <Card className="community-hero-card border-0 shadow-sm mb-4 text-white">
        <Card.Body className="p-4 p-lg-5 position-relative">
          <div className="community-hero-overlay" />
          <div className="position-relative">
            <h3 className="fw-bold mb-2">Community Hub</h3>
            <p className="mb-4 lead">
              Celebrate wins, find collaborators, and unlock help from fellow HSAPSS students.
            </p>
            <div className="d-flex flex-wrap gap-3">
              <Button
                variant="light"
                onClick={() => setActivePane('help')}
                className="text-primary fw-semibold"
              >
                <i className="fas fa-life-ring me-2"></i>
                Ask for help
              </Button>
              <Button
                variant="outline-light"
                className="fw-semibold text-white"
                onClick={() => openConversationWithStudent(
                  communityProfiles.find((profile) => !profile.is_self) || communityProfiles[0] || {}
                )}
                disabled={communityProfiles.length === 0}
              >
                <i className="fas fa-paper-plane me-2"></i>
                Say hello
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      <div className="row g-4 align-items-start">
        <div className="col-12 col-xl-4">
          <Card className="border-0 shadow-sm mb-4 community-search-card">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h6 className="fw-semibold mb-1">Find your people</h6>
                  <small className="text-muted">
                    Search by name, skills, program, or interests.
                  </small>
                </div>
              </div>
              <Form className="community-search-form" onSubmit={handleCommunitySearchSubmit}>
                <div className="d-flex flex-column gap-3">
                  <Form.Control
                    type="search"
                    placeholder="Type a keyword to explore"
                    value={communitySearch}
                    onChange={(event) => setCommunitySearch(event.target.value)}
                  />
                  <div className="d-flex gap-2">
                    <Button type="submit" variant="primary" className="flex-grow-1" disabled={communityLoading}>
                      {communityLoading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" role="status" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-search me-2"></i>
                          Search
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={() => {
                        setCommunitySearch('');
                        refreshCommunityProfiles('');
                      }}
                      disabled={communityLoading}
                    >
                      <i className="fas fa-sync-alt"></i>
                    </Button>
                  </div>
                </div>
              </Form>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm community-inbox-card">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6 className="fw-semibold mb-1">Conversations</h6>
                  <small className="text-muted">
                    {inboxThreads.length
                      ? 'Pick up where you left off.'
                      : 'Start a fresh conversation with someone new.'}
                  </small>
                </div>
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => refreshInboxThreads()}
                  disabled={inboxLoading}
                >
                  <i className="fas fa-rotate-right"></i>
                </Button>
              </div>
              {inboxError && (
                <Alert variant="warning" className="py-2">
                  {inboxError}
                </Alert>
              )}
              {inboxLoading && inboxThreads.length === 0 ? (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status" />
                </div>
              ) : inboxThreads.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  No conversations yet. Reach out to a student that inspires you.
                </div>
              ) : (
                <ListGroup variant="flush" className="conversation-thread-list">
                  {inboxThreads.map((thread) => (
                    <ListGroup.Item
                      key={thread.student.id}
                      action
                      onClick={() => openConversationWithStudent(thread)}
                      className="d-flex gap-3 align-items-start"
                    >
                      <div className="conversation-avatar">
                        {buildInitials(thread.student.first_name, thread.student.last_name)}
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <div
                            className="fw-semibold conversation-thread-name"
                            role="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openProfilePreview(thread.student);
                            }}
                          >
                            {thread.student.first_name} {thread.student.last_name}
                          </div>
                          <small className="text-muted">
                            {formatConversationTimestamp(thread.lastTimestamp)}
                          </small>
                        </div>
                        <div className="thread-presence text-muted small mb-1">
                          <span
                            className={`presence-dot ${thread.student.online ? 'presence-dot-online' : ''}`}
                            aria-hidden="true"
                          ></span>
                          {formatPresenceText(thread.student.online, thread.student.last_seen)}
                        </div>
                        <div className="text-muted small text-truncate mb-1">
                          {thread.lastMessage || 'Say hi and introduce yourself.'}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {thread.student.study && (
                            <span className="badge bg-primary-subtle text-primary-emphasis">
                              {thread.student.study}
                            </span>
                          )}
                          {thread.unreadCount > 0 && (
                            <Badge bg="primary" pill>
                              {thread.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </div>

        <div className="col-12 col-xl-8">
          {communityError && (
            <Alert variant="danger" className="mb-4">
              {communityError}
            </Alert>
          )}

          {communityLoading && communityProfiles.length === 0 ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" className="text-primary" />
              <p className="text-muted small mt-3 mb-0">Loading community profiles...</p>
            </div>
          ) : communityProfiles.length === 0 ? (
            <div className="text-center py-5">
              <div className="empty-state-icon mb-3">
                <i className="fas fa-users"></i>
              </div>
              <h6 className="fw-semibold mb-2">No matching profiles yet</h6>
              <p className="text-muted small mb-0">
                Encourage your friends to update their profiles or adjust your search filters.
              </p>
            </div>
          ) : (
            <div className="row g-4">
              {communityProfiles.map((profile) => (
                <div key={profile.id} className="col-12 col-md-6">
                  <Card className="community-card h-100 border-0 shadow-sm">
                    <Card.Body className="d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <div className="d-flex align-items-center gap-2">
                            <div className="conversation-avatar conversation-avatar-sm">
                              {buildInitials(profile.first_name, profile.last_name)}
                            </div>
                            <div>
                              <h6
                                className="fw-bold mb-0 community-name-link"
                                role="button"
                                onClick={() => openProfilePreview(profile)}
                              >
                                {profile.first_name} {profile.last_name}{' '}
                                {profile.is_self && (
                                  <Badge bg="primary" pill>
                                    You
                                  </Badge>
                                )}
                              </h6>
                              {profile.community_headline && (
                                <p className="text-muted small mb-0">{profile.community_headline}</p>
                              )}
                              <div className="presence-line text-muted small mt-1">
                                <span
                                  className={`presence-dot ${profile.online ? 'presence-dot-online' : ''}`}
                                  aria-hidden="true"
                                ></span>
                                {formatPresenceText(profile.online, profile.last_seen)}
                              </div>
                            </div>
                          </div>
                        </div>
                        {profile.available_to_help && (
                          <Badge bg="success" pill>
                            Available to help
                          </Badge>
                        )}
                      </div>
                      {profile.community_bio && (
                        <p className="text-muted small mb-3">{profile.community_bio}</p>
                      )}
                      {profile.community_skills?.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          {profile.community_skills.map((skill) => (
                            <span
                              key={`${profile.id}-${skill}`}
                              className="badge rounded-pill bg-primary-subtle text-primary-emphasis"
                            >
                              <i className="fas fa-star me-1"></i>
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                      {profile.community_interests?.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          {profile.community_interests.map((interest) => (
                            <span
                              key={`${profile.id}-interest-${interest}`}
                              className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}
                      <ul className="list-unstyled small mb-3">
                        {profile.study && (
                          <li className="mb-1">
                            <i className="fas fa-graduation-cap me-2 text-primary"></i>
                            {profile.study}
                          </li>
                        )}
                        {profile.post_graduation_plan && (
                          <li className="mb-1">
                            <i className="fas fa-briefcase me-2 text-primary"></i>
                            {profile.post_graduation_plan}
                          </li>
                        )}
                      </ul>
                      {profile.help_offering && (
                        <div className="small bg-primary-subtle text-primary-emphasis rounded-3 p-3 mb-3">
                          <i className="fas fa-hands-helping me-2"></i>
                          {profile.help_offering}
                        </div>
                      )}
                      {(profile.mail_id || profile.phone) && (
                        <div className="community-contact small mb-3">
                          {profile.mail_id && (
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip id={`tooltip-email-${profile.id}`}>Copy email</Tooltip>}
                            >
                              <button
                                type="button"
                                className="contact-chip"
                                onClick={() => {
                                  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                                    navigator.clipboard.writeText(profile.mail_id);
                                  }
                                }}
                              >
                                <i className="fas fa-envelope me-2"></i>
                                {profile.mail_id}
                              </button>
                            </OverlayTrigger>
                          )}
                          {profile.phone && (
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip id={`tooltip-phone-${profile.id}`}>Copy phone</Tooltip>}
                            >
                              <button
                                type="button"
                                className="contact-chip"
                                onClick={() => {
                                  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                                    navigator.clipboard.writeText(profile.phone);
                                  }
                                }}
                              >
                                <i className="fas fa-phone me-2"></i>
                                {profile.phone}
                              </button>
                            </OverlayTrigger>
                          )}
                        </div>
                      )}
                      <div className="d-flex flex-wrap gap-2 mt-auto">
                        {!profile.is_self && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => openConversationWithStudent(profile)}
                          >
                            <i className="fas fa-message me-2"></i>
                            Message
                          </Button>
                        )}
                        {!profile.is_self && profile.available_to_help && (
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() =>
                              openConversationWithStudent(
                                profile,
                                `Hey ${profile.first_name || ''}! I saw you're available to help with "${profile.help_offering || 'students'}" and would love to connect.`
                              )
                            }
                          >
                            <i className="fas fa-hands-helping me-2"></i>
                            Request Support
                          </Button>
                        )}
                        {profile.linkedin_url && (
                          <a
                            href={profile.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline-secondary btn-sm"
                          >
                            <i className="fab fa-linkedin me-2"></i>
                            LinkedIn
                          </a>
                        )}
                        {profile.portfolio_url && (
                          <a
                            href={profile.portfolio_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline-secondary btn-sm"
                          >
                            <i className="fas fa-globe me-2"></i>
                            Portfolio
                          </a>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderHelpPane = () => (
    <div className="help-pane">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h5 className="fw-semibold mb-1">HSAPSS Help Board</h5>
          <p className="text-muted small mb-0">
            Ask for advice, share resources, and respond when you can support a fellow student.
          </p>
        </div>
        <div className="btn-group">
          <Button
            type="button"
            variant={helpScope === 'open' ? 'primary' : 'outline-primary'}
            onClick={() => handleHelpScopeChange('open')}
          >
            <i className="fas fa-comments me-2"></i>
            Open Requests
          </Button>
          <Button
            type="button"
            variant={helpScope === 'mine' ? 'primary' : 'outline-primary'}
            onClick={() => handleHelpScopeChange('mine')}
          >
            <i className="fas fa-user-check me-2"></i>
            My Requests
          </Button>
        </div>
      </div>

      {helpError && (
        <Alert variant="danger" className="mb-4">
          {helpError}
        </Alert>
      )}
      {helpSuccess && (
        <Alert variant="success" className="mb-4">
          {helpSuccess}
        </Alert>
      )}

      <Card className="border-0 shadow-sm mb-4 help-form-card">
        <Card.Body>
          <h6 className="fw-semibold mb-3">
            <i className="fas fa-plus-circle me-2 text-primary"></i>
            Create a help request
          </h6>
          <Form onSubmit={handleHelpRequestSubmit}>
            <div className="row g-3">
              <div className="col-12 col-lg-6">
                <Form.Group controlId="help-request-title">
                  <Form.Label>What do you need help with?</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. Interview prep, resume review, finding roommates"
                    value={helpForm.title}
                    onChange={(event) => handleHelpFieldChange('title', event.target.value)}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-12 col-lg-6">
                <Form.Group controlId="help-request-tags">
                  <Form.Label>Topics</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Separate keywords with commas"
                    value={helpForm.tags}
                    onChange={(event) => handleHelpFieldChange('tags', event.target.value)}
                  />
                  <Form.Text className="text-muted small">
                    Example: jobs, housing, immigration, networking
                  </Form.Text>
                </Form.Group>
              </div>
              <div className="col-12">
                <Form.Group controlId="help-request-description">
                  <Form.Label>Details</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Share more context so the right person can respond."
                    value={helpForm.description}
                    onChange={(event) => handleHelpFieldChange('description', event.target.value)}
                  />
                </Form.Group>
              </div>
            </div>
            <div className="d-flex justify-content-end mt-3">
              <Button type="submit" variant="primary" disabled={helpSubmitLoading}>
                {helpSubmitLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" role="status" />
                    Posting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane me-2"></i>
                    Post Request
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {helpLoading && helpRequests.length === 0 ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" className="text-primary" />
          <p className="text-muted small mt-3 mb-0">Loading help requests...</p>
        </div>
      ) : helpRequests.length === 0 ? (
        <div className="text-center py-5">
          <div className="empty-state-icon mb-3">
            <i className="fas fa-comments"></i>
          </div>
          <h6 className="fw-semibold mb-2">No requests yet</h6>
          <p className="text-muted small mb-0">
            Be the first to ask for help or switch back to &quot;Open Requests&quot;.
          </p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {helpRequests.map((request) => (
            <Card key={request.id} className="border-0 shadow-sm help-request-card">
              <Card.Body>
                <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h6 className="fw-semibold mb-0">{request.title}</h6>
                      <Badge bg={request.status === 'open' ? 'primary' : 'secondary'}>
                        {request.status === 'open' ? 'Open' : 'Closed'}
                      </Badge>
                      {request.is_owner && (
                        <Badge bg="info" text="dark">
                          Your request
                        </Badge>
                      )}
                    </div>
                    {request.student && (
                      <div className="d-flex flex-column gap-1 mb-2 text-muted small">
                        <span>
                          {request.student.first_name} {request.student.last_name}
                          {request.student.study && ` - ${request.student.study}`}
                        </span>
                        <div className="presence-line">
                          <span
                            className={`presence-dot ${request.student.online ? 'presence-dot-online' : ''}`}
                            aria-hidden="true"
                          ></span>
                          {formatPresenceText(request.student.online, request.student.last_seen)}
                        </div>
                      </div>
                    )}
                    {request.description && (
                      <p className="text-muted small mb-2">{request.description}</p>
                    )}
                    {request.tags?.length > 0 && (
                      <div className="d-flex flex-wrap gap-2 mb-2">
                        {request.tags.map((tag) => (
                          <span key={`${request.id}-tag-${tag}`} className="badge rounded-pill bg-primary-subtle text-primary-emphasis">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-md-end small text-muted">
                    {request.updated_at && (
                      <div>
                        Updated{' '}
                        {new Date(request.updated_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </div>
                    )}
                    {request.student?.help_offering && (
                      <div className="mt-2">
                        <i className="fas fa-hands-helping me-2 text-success"></i>
                        {request.student.help_offering}
                      </div>
                    )}
                  </div>
                </div>

                {request.responses?.length > 0 && (
                  <div className="help-responses mt-3">
                    {request.responses.map((response, index) => (
                      <div key={`${request.id}-response-${index}`} className="help-response border rounded-3 p-3 mb-2">
                        <div className="d-flex justify-content-between gap-2">
                          <div className="small fw-semibold">
                            <i className="fas fa-user-friends me-2 text-primary"></i>
                            {response.responder
                              ? `${response.responder.first_name} ${response.responder.last_name}`
                              : 'Anonymous helper'}
                          </div>
                          {response.created_at && (
                            <span className="text-muted small">
                              {new Date(response.created_at).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </span>
                          )}
                        </div>
                        <div className="help-response-main d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mt-2">
                          <p className="help-response-message text-muted small mb-0 flex-grow-1">{response.message}</p>
                          <div className="help-response-actions d-flex flex-column gap-2">
                            {response.responder && (
                              <div className="thread-presence text-muted small">
                                <span
                                  className={`presence-dot ${response.responder.online ? 'presence-dot-online' : ''}`}
                                  aria-hidden="true"
                                ></span>
                                {formatPresenceText(response.responder.online, response.responder.last_seen)}
                              </div>
                            )}
                            {response.responder?.id && response.responder.id !== (student?._id || '') && (
                              <Button
                                size="sm"
                                variant="outline-primary"
                                className="fw-semibold message-helper-btn"
                                onClick={() =>
                                  openConversationWithStudent({
                                    id: response.responder.id,
                                    first_name: response.responder.first_name,
                                    last_name: response.responder.last_name,
                                    study: response.responder.study,
                                    community_headline: response.responder.help_offering,
                                    online: response.responder.online,
                                    last_seen: response.responder.last_seen
                                  })
                                }
                              >
                                <i className="fas fa-comment-dots me-2"></i>
                                Message {response.responder.first_name || 'helper'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {request.status === 'open' && (
                  <div className="mt-3 border-top pt-3">
                    {request.is_owner ? (
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <p className="text-muted small mb-0">
                          Mark as closed when you have the support you need.
                        </p>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handleCloseRequest(request.id)}
                          disabled={respondingRequestId === request.id}
                        >
                          {respondingRequestId === request.id ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" role="status" />
                              Closing...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-check me-2"></i>
                              Mark as resolved
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Form
                        onSubmit={(event) => {
                          event.preventDefault();
                          handleRespondToRequest(request.id);
                        }}
                      >
                        <Form.Group controlId={`help-response-${request.id}`}>
                          <Form.Label className="small fw-semibold">
                            Share how you can help
                          </Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            placeholder="Offer guidance, share resources, or suggest next steps..."
                            value={responseDrafts[request.id] || ''}
                            onChange={(event) =>
                              handleResponseDraftChange(request.id, event.target.value)
                            }
                            disabled={respondingRequestId === request.id}
                          />
                        </Form.Group>
                        <div className="d-flex justify-content-end mt-2">
                          <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={respondingRequestId === request.id}
                          >
                            {respondingRequestId === request.id ? (
                              <>
                                <Spinner
                                  animation="border"
                                  size="sm"
                                  className="me-2"
                                  role="status"
                                />
                                Sending...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-hands-helping me-2"></i>
                                Offer help
                              </>
                            )}
                          </Button>
                        </div>
                      </Form>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderAccountPane = () => (
    <div className="account-pane">
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <h5 className="fw-semibold mb-3">Account Security</h5>
          <p className="text-muted small mb-4">
            Set a personal password so only you can update your profile. Coordinators will still be
            able to support you if needed.
          </p>
          {portalMeta.used_default_password && (
            <Alert variant="warning">
              <i className="fas fa-exclamation-triangle me-2"></i>
              You are currently using the shared portal password. Update it below to secure your
              account.
            </Alert>
          )}
          {passwordError && (
            <Alert variant="danger" className="mb-3">
              {passwordError}
            </Alert>
          )}
          {passwordSuccess && (
            <Alert variant="success" className="mb-3">
              {passwordSuccess}
            </Alert>
          )}
          <Form onSubmit={handlePasswordUpdate}>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <Form.Group controlId="portal-password-current">
                  <Form.Label>Current Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordForm.current}
                    onChange={(event) => handlePasswordFieldChange('current', event.target.value)}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-12 col-md-4">
                <Form.Group controlId="portal-password-new">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordForm.next}
                    onChange={(event) => handlePasswordFieldChange('next', event.target.value)}
                    minLength={8}
                    required
                  />
                  <Form.Text className="text-muted small">
                    Use at least 8 characters with a mix of letters and numbers.
                  </Form.Text>
                </Form.Group>
              </div>
              <div className="col-12 col-md-4">
                <Form.Group controlId="portal-password-confirm">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(event) => handlePasswordFieldChange('confirm', event.target.value)}
                    required
                  />
                </Form.Group>
              </div>
            </div>
            <div className="d-flex justify-content-end mt-4">
              <Button type="submit" variant="primary" disabled={passwordLoading}>
                {passwordLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" role="status" />
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-lock me-2"></i>
                    Update Password
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          <h6 className="fw-semibold mb-2">Session summary</h6>
          <ul className="list-unstyled small mb-0">
            <li className="mb-2">
              <i className="fas fa-check-circle text-success me-2"></i>
              Logged in as {student.first_name} {student.last_name}
            </li>
            <li className="mb-2">
              <i className="fas fa-key text-primary me-2"></i>
              {portalMeta.has_custom_password
                ? 'Custom password is active.'
                : 'Using shared password until you set your own.'}
            </li>
            <li className="mb-0">
              <i className="fas fa-users text-primary me-2"></i>
              Community visibility:{' '}
              {formData.community_visibility === 'hidden'
                ? 'Only HSAPSS coordinators can view your profile.'
                : 'Visible to logged-in HSAPSS students.'}
            </li>
          </ul>
        </Card.Body>
      </Card>
    </div>
  );

  return (
    <>
      <Head>
        <title>Student Portal | HSAPSS Windsor</title>
      </Head>
      <main className="main-content py-5">
        <div className="container">
          <Card className="shadow border-0 student-portal-card">
            <Card.Header className="bg-primary text-white py-4">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                  <h5 className="mb-1">
                    <i className="fas fa-user-graduate me-2"></i>
                    HSAPSS Windsor Youths Portal
                  </h5>
                  <p className="mb-0 small text-white-50">
                    {student
                      ? 'Update your profile, connect with peers, and ask for support from the community.'
                      : 'Sign in with your phone number and password - or create an account to join the HSAPSS community.'}
                  </p>
                </div>
                {student && (
                  <Button variant="outline-light" size="sm" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Log Out
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body className="p-4 p-md-5">
              {errorMessage && (
                <Alert variant="danger" className="mb-4">
                  {errorMessage}
                </Alert>
              )}
              {successMessage && (
                <Alert variant="success" className="mb-4">
                  {successMessage}
                </Alert>
              )}
              {student && (
                <div className="portal-action-ribbon mb-4">
                  <button
                    type="button"
                    className={`ribbon-action ${activePane === 'profile' ? 'is-active' : ''}`}
                    onClick={() => setActivePane('profile')}
                    aria-pressed={activePane === 'profile'}
                  >
                    <span className="ribbon-icon bg-primary-subtle text-primary"><i className="fas fa-id-card"></i></span>
                    <div>
                      <span className="ribbon-label">My Profile</span>
                      <span className="ribbon-subtitle">Keep your info current</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`ribbon-action ${activePane === 'community' ? 'is-active' : ''}`}
                    onClick={() => setActivePane('community')}
                    aria-pressed={activePane === 'community'}
                  >
                    <span className="ribbon-icon bg-success-subtle text-success"><i className="fas fa-users"></i></span>
                    <div>
                      <span className="ribbon-label">Community</span>
                      <span className="ribbon-subtitle">{communityCount} profiles</span>
                    </div>
                    {communityCount > 0 && <span className="ribbon-badge">Explore</span>}
                  </button>
                  <button
                    type="button"
                    className={`ribbon-action ${activePane === 'community' && showConversationPanel ? 'is-active' : ''}`}
                    onClick={() => {
                      setActivePane('community');
                      openFirstConversation();
                    }}
                    aria-pressed={showConversationPanel}
                  >
                    <span className="ribbon-icon bg-info-subtle text-info"><i className="fas fa-comments"></i></span>
                    <div>
                      <span className="ribbon-label">Inbox</span>
                      <span className="ribbon-subtitle">
                        {totalUnreadMessages > 0
                          ? `${totalUnreadMessages} unread messages`
                          : 'Say hello to someone new'}
                      </span>
                    </div>
                    {totalUnreadMessages > 0 && (
                      <span className="ribbon-badge ribbon-badge-accent">{totalUnreadMessages}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`ribbon-action ${activePane === 'help' ? 'is-active' : ''}`}
                    onClick={() => setActivePane('help')}
                    aria-pressed={activePane === 'help'}
                  >
                    <span className="ribbon-icon bg-warning-subtle text-warning"><i className="fas fa-life-ring"></i></span>
                    <div>
                      <span className="ribbon-label">Help Board</span>
                      <span className="ribbon-subtitle">
                        {openHelpCount > 0
                          ? `${openHelpCount} open requests`
                          : 'Share how you can help'}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`ribbon-action ${activePane === 'account' ? 'is-active' : ''}`}
                    onClick={() => setActivePane('account')}
                    aria-pressed={activePane === 'account'}
                  >
                    <span className="ribbon-icon bg-dark-subtle text-dark"><i className="fas fa-lock"></i></span>
                    <div>
                      <span className="ribbon-label">Account</span>
                      <span className="ribbon-subtitle">Change password or sign out</span>
                    </div>
                  </button>
                </div>
              )}
              {!student ? (
                <div className="portal-auth-grid row align-items-center g-4">
                  <div className="col-lg-5">
                    <div className="portal-auth-hero">
                      <span className="badge rounded-pill bg-primary-subtle text-primary-emphasis fw-semibold mb-3">
                        <i className="fas fa-hand-holding-heart me-2"></i>
                        Welcome to HSAPSS Windsor
                      </span>
                      <h2 className="fw-bold mb-3">A single space for every windsor yuvak journey.</h2>
                      <p className="text-muted mb-4">
                        Update your story, discover peers with shared goals, and create a ripple of support across the HSAPSS family.
                      </p>
                      <ul className="portal-auth-list">
                        <li>
                          <i className="fas fa-circle-check text-success me-2"></i>
                          Update once, stay connected forever.
                        </li>
                        <li>
                          <i className="fas fa-circle-check text-success me-2"></i>
                          Get tailored help through the community bulletin.
                        </li>
                        <li>
                          <i className="fas fa-circle-check text-success me-2"></i>
                          Share how you can mentor or guide incoming yuvaks.
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="col-lg-7">
                    <div className="portal-auth-card shadow-sm">
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                        <div>
                          <h3 className="fw-semibold mb-1">
                            {authMode === 'login' ? 'Sign in to your portal' : 'Create your community account'}
                          </h3>
                          <p className="text-muted small mb-0">
                            {authMode === 'login'
                              ? 'Log in with the phone number you registered with HSAPSS.'
                              : 'Create a password to start updating your information and connecting.'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={authMode === 'login' ? 'outline-primary' : 'outline-secondary'}
                          onClick={() => switchAuthMode(authMode === 'login' ? 'register' : 'login')}
                          className="fw-semibold"
                        >
                          {authMode === 'login' ? (
                            <>
                              <i className="fas fa-user-plus me-2"></i>
                              Need an account?
                            </>
                          ) : (
                            <>
                              <i className="fas fa-sign-in-alt me-2"></i>
                              Back to login
                            </>
                          )}
                        </Button>
                      </div>
                      {authMode === 'login' ? (
                        <Form onSubmit={handleLogin} className="student-portal-form" autoComplete="off">
                          <div className="row g-4">
                            <div className="col-12 col-md-6">
                              <Form.Group controlId="student-portal-login-phone">
                                <Form.Label>Phone Number</Form.Label>
                                <Form.Control
                                  type="tel"
                                  placeholder="Enter your phone number"
                                  value={loginPhone}
                                  onChange={(event) => setLoginPhone(event.target.value)}
                                  required
                                />
                              </Form.Group>
                            </div>
                            <div className="col-12 col-md-6">
                              <Form.Group controlId="student-portal-login-password">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                  type="password"
                                  placeholder="Enter your password"
                                  value={loginPassword}
                                  onChange={(event) => setLoginPassword(event.target.value)}
                                  required
                                />
                                <Form.Text className="text-muted small d-block mt-2">
                                  {passwordHint}
                                </Form.Text>
                              </Form.Group>
                            </div>
                          </div>
                          <div className="d-flex justify-content-end mt-4">
                            <Button type="submit" className="portal-auth-submit" disabled={loginLoading}>
                              {loginLoading ? (
                                <>
                                  <Spinner animation="border" size="sm" className="me-2" role="status" />
                                  Logging in...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-arrow-right me-2"></i>
                                  Continue
                                </>
                              )}
                            </Button>
                          </div>
                        </Form>
                      ) : (
                        <Form onSubmit={handleRegister} className="student-portal-form" autoComplete="off">
                          <div className="row g-4">
                            <div className="col-12 col-md-6">
                              <Form.Group controlId="student-portal-register-phone">
                                <Form.Label>Phone Number</Form.Label>
                                <Form.Control
                                  type="tel"
                                  placeholder="Enter your phone number"
                                  value={registerPhone}
                                  onChange={(event) => setRegisterPhone(event.target.value)}
                                  required
                                />
                              </Form.Group>
                            </div>
                            <div className="col-12 col-md-6">
                              <Form.Group controlId="student-portal-register-password">
                                <Form.Label>Create Password</Form.Label>
                                <Form.Control
                                  type="password"
                                  placeholder="Choose a password (8+ characters)"
                                  value={registerPassword}
                                  onChange={(event) => setRegisterPassword(event.target.value)}
                                  required
                                  minLength={8}
                                />
                              </Form.Group>
                            </div>
                            <div className="col-12 col-md-6">
                              <Form.Group controlId="student-portal-register-confirm">
                                <Form.Label>Confirm Password</Form.Label>
                                <Form.Control
                                  type="password"
                                  placeholder="Re-enter your password"
                                  value={registerConfirm}
                                  onChange={(event) => setRegisterConfirm(event.target.value)}
                                  required
                                  minLength={8}
                                />
                                <Form.Text className="text-muted small d-block mt-2">
                                  You&apos;ll use this password each time you log in.
                                </Form.Text>
                              </Form.Group>
                            </div>
                          </div>
                          <div className="d-flex justify-content-end mt-4">
                            <Button type="submit" className="portal-auth-submit" disabled={registerLoading}>
                              {registerLoading ? (
                                <>
                                  <Spinner animation="border" size="sm" className="me-2" role="status" />
                                  Creating account...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-arrow-right me-2"></i>
                                  Join the community
                                </>
                              )}
                            </Button>
                          </div>
                        </Form>
                      )}
                    </div>
                  </div>
                </div>
              ) : showThankYou ? (
                <div className="thank-you-state text-center py-5 px-3">
                  <div className="thank-you-icon mx-auto mb-4">
                    <i className="fas fa-hands-helping"></i>
                  </div>
                  <h2 className="fw-bold mb-3">Your profile is all set!</h2>
                  <p className="lead text-muted mb-4">
                    Thanks for keeping your details current. Jump into the community to connect with
                    peers or open the help board to support someone else.
                  </p>
                  <div className="d-flex justify-content-center gap-3 flex-wrap">
                    <Button
                      variant="primary"
                      onClick={() => {
                        setShowThankYou(false);
                        setActivePane('community');
                        refreshCommunityProfiles();
                      }}
                    >
                      <i className="fas fa-users me-2"></i>
                      Explore Community
                    </Button>
                    <Button
                      variant="outline-primary"
                      onClick={() => {
                        setShowThankYou(false);
                        setActivePane('profile');
                      }}
                    >
                      <i className="fas fa-user-edit me-2"></i>
                      Review My Details
                    </Button>
                    <Button variant="outline-secondary" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt me-2"></i>
                      Log Out
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="portal-view-toggle d-flex flex-wrap gap-2 mb-4">
                    {portalViews.map((view) => (
                      <Button
                        key={view.key}
                        type="button"
                        variant={activePane === view.key ? 'primary' : 'outline-primary'}
                        onClick={() => setActivePane(view.key)}
                      >
                        <i className={`${view.icon} me-2`}></i>
                        {view.label}
                      </Button>
                    ))}
                  </div>

                  {activePane === 'profile' && (
                    <Form onSubmit={handleUpdate} className="student-portal-form" noValidate>
                      <div className="portal-sections">
                        {portalSections.map((section) => (
                          <section key={section.key} className="portal-section">
                            <div className="portal-section-header">
                              <span className="portal-section-icon">
                                <i className={section.icon}></i>
                              </span>
                              <div>
                                <h6 className="portal-section-title mb-1">{section.title}</h6>
                                <p className="portal-section-subtitle mb-0 text-muted">
                                  {section.subtitle}
                                </p>
                              </div>
                            </div>
                            <div className="row g-4">
                              {section.fields.map((fieldName) => {
                                if (
                                  !workingPlan &&
                                  (fieldName === 'employment_company' ||
                                    fieldName === 'employment_role')
                                ) {
                                  return null;
                                }
                                const fieldConfig = FIELD_CONFIG_MAP.get(fieldName);
                                if (!fieldConfig) {
                                  return null;
                                }
                                return (
                                  <div key={fieldName} className={getFieldColumnClass(fieldConfig)}>
                                    {renderFormControl(fieldConfig)}
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                      </div>
                      <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mt-4">
                        <p className="text-muted small mb-0">
                          Need help? Contact your HSAPSS coordinator to change anything you cannot
                          update here.
                        </p>
                        <Button type="submit" variant="primary" disabled={updateLoading}>
                          {updateLoading ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" role="status" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save me-2"></i>
                              Save My Details
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>
                  )}

                  {activePane === 'community' && renderCommunityPane()}
                  {activePane === 'help' && renderHelpPane()}
                  {activePane === 'account' && renderAccountPane()}
                </>
              )}
            </Card.Body>
          </Card>
        </div>
      </main>
      {student && (
        <nav className="portal-mobile-nav d-lg-none">
          <button
            type="button"
            className={activePane === 'profile' ? 'active' : ''}
            onClick={() => setActivePane('profile')}
          >
            <span className="icon-wrapper">
              <i className="fas fa-id-card"></i>
            </span>
            <span>Profile</span>
          </button>
          <button
            type="button"
            className={activePane === 'community' ? 'active' : ''}
            onClick={() => setActivePane('community')}
          >
            <span className="icon-wrapper">
              <i className="fas fa-users"></i>
            </span>
            <span>Community</span>
          </button>
          <button
            type="button"
            className={showConversationPanel ? 'active' : ''}
            onClick={() => {
              setActivePane('community');
              openFirstConversation();
            }}
          >
            <span className="icon-wrapper">
              <i className="fas fa-comment-dots"></i>
            </span>
            <span>Inbox</span>
            {totalUnreadMessages > 0 && (
              <Badge bg="danger" pill className="ms-0 mt-1">
                {totalUnreadMessages}
              </Badge>
            )}
          </button>
          <button
            type="button"
            className={activePane === 'help' ? 'active' : ''}
            onClick={() => setActivePane('help')}
          >
            <span className="icon-wrapper">
              <i className="fas fa-life-ring"></i>
            </span>
            <span>Help</span>
          </button>
        </nav>
      )}
      <ToastContainer position="bottom-end" className="p-3">
        {toastQueue.map((toast) => (
          <Toast
            key={toast.id}
            onClose={() => dismissToast(toast.id)}
            delay={6000}
            autohide
            bg={toast.variant}
          >
            <Toast.Header closeButton>
              <strong className="me-auto">
                {toast.title || 'Notification'}
              </strong>
            </Toast.Header>
            <Toast.Body className="text-white">
              <div>{toast.message}</div>
              {toast.actionLabel && toast.onAction && (
                <Button
                  size="sm"
                  variant="outline-light"
                  className="mt-3"
                  onClick={() => {
                    toast.onAction();
                    dismissToast(toast.id);
                  }}
                >
                  {toast.actionLabel}
                </Button>
              )}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
      <Offcanvas
        show={showConversationPanel}
        onHide={handleCloseConversation}
        placement="end"
        className="conversation-offcanvas"
      >
        <Offcanvas.Header closeButton className="conversation-header align-items-start">
          <div className="flex-grow-1 me-3">
            <Offcanvas.Title as="div" className="conversation-title-block">
              <div className="conversation-title">
                {activeConversation
                  ? `${activeConversation.first_name || ''} ${activeConversation.last_name || ''}`.trim() ||
                    'Conversation'
                  : 'Conversation'}
              </div>
              <div
                className={`conversation-status ${
                  activeConversation?.online ? 'is-online' : ''
                }`}
              >
                <span
                  className={`presence-dot me-2 ${activeConversation?.online ? 'presence-dot-online' : ''}`}
                  aria-hidden="true"
                ></span>
                {formatPresenceText(
                  Boolean(activeConversation?.online),
                  activeConversation?.last_seen || null
                )}
              </div>
            </Offcanvas.Title>
          </div>
          <Button
            variant="outline-secondary"
            size="sm"
            className="conversation-clear"
            onClick={handleClearConversation}
            disabled={!activeConversation?.id}
          >
            <i className="fas fa-broom me-2"></i>
            Clear Chat
          </Button>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column">
          {activeConversation?.community_headline && (
            <p className="text-muted small mb-2">{activeConversation.community_headline}</p>
          )}
          {activeConversation?.help_offering && (
            <div className="small bg-primary-subtle text-primary-emphasis rounded-3 p-3 mb-3">
              <i className="fas fa-hands-helping me-2"></i>
              {activeConversation.help_offering}
            </div>
          )}
          {conversationError && (
            <Alert variant="danger" className="py-2">
              {conversationError}
            </Alert>
          )}
          <div className="conversation-messages flex-grow-1 mb-3">
            {conversationLoading && conversationMessages.length === 0 ? (
              <div className="text-center py-4">
                <Spinner animation="border" role="status" />
              </div>
            ) : conversationMessages.length === 0 ? (
              <div className="text-center text-muted small py-4">
                Start the conversation with a friendly hello.
              </div>
            ) : (
              conversationMessages.map((message) => {
                const isOwn = message.sender?.id === (student?._id || '');
                return (
                  <div
                    key={message.id}
                    className={`conversation-message ${isOwn ? 'conversation-message--self' : ''}`}
                  >
                    <div className="conversation-message-meta">
                      <span className="conversation-message-author">
                        {isOwn ? 'You' : message.sender?.name || activeConversation?.first_name || ''}
                      </span>
                      <span className="conversation-message-time">
                        {formatConversationTimestamp(message.created_at)}
                      </span>
                    </div>
                    <div className="conversation-message-bubble">{message.body}</div>
                  </div>
                );
              })
            )}
            <div ref={conversationEndRef} />
          </div>
          <Form onSubmit={handleSendConversationMessage}>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder={
                activeConversation
                  ? `Write a message to ${activeConversation.first_name || 'them'}...`
                  : 'Select someone to start chatting...'
              }
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value)}
              className="mb-3"
              maxLength={2000}
              disabled={conversationLoading || !activeConversation}
            />
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                {messageDraft.trim().length}
                /2000
              </small>
              <Button
                type="submit"
                variant="primary"
                disabled={
                  conversationLoading || !activeConversation || messageDraft.trim().length === 0
                }
              >
                <i className="fas fa-paper-plane me-2"></i>
                Send
              </Button>
            </div>
          </Form>
        </Offcanvas.Body>
      </Offcanvas>
      <Offcanvas
        show={showProfilePreview}
        onHide={closeProfilePreview}
        placement="start"
        className="profile-offcanvas"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            {profilePreview
              ? `${profilePreview.first_name || ''} ${profilePreview.last_name || ''}`.trim()
              : 'Student Profile'}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {profilePreview ? (
            <div className="profile-preview">
              <div className="presence-line text-muted small mb-3">
                <span
                  className={`presence-dot ${profilePreview.online ? 'presence-dot-online' : ''}`}
                  aria-hidden="true"
                ></span>
                {formatPresenceText(profilePreview.online, profilePreview.last_seen)}
              </div>
              {profilePreview.community_headline && (
                <p className="text-muted small mb-3">{profilePreview.community_headline}</p>
              )}
              {profilePreview.community_bio && (
                <p className="mb-4">{profilePreview.community_bio}</p>
              )}
              <div className="profile-preview-section">
                <h6>Areas of Study</h6>
                <p className="text-muted mb-0">{profilePreview.study || 'Not provided'}</p>
              </div>
              <div className="profile-preview-section">
                <h6>Skills</h6>
                {profilePreview.community_skills?.length ? (
                  <div className="d-flex flex-wrap gap-2">
                    {profilePreview.community_skills.map((skill) => (
                      <span
                        key={`${profilePreview.id}-skill-${skill}`}
                        className="badge bg-primary-subtle text-primary-emphasis"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No skills listed yet.</p>
                )}
              </div>
              <div className="profile-preview-section">
                <h6>Interests</h6>
                {profilePreview.community_interests?.length ? (
                  <div className="d-flex flex-wrap gap-2">
                    {profilePreview.community_interests.map((interest) => (
                      <span
                        key={`${profilePreview.id}-interest-${interest}`}
                        className="badge bg-secondary-subtle text-secondary-emphasis"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No interests listed yet.</p>
                )}
              </div>
              {(profilePreview.mail_id || profilePreview.phone) && (
                <div className="profile-preview-section">
                  <h6>Contact</h6>
                  <div className="community-contact">
                    {profilePreview.mail_id && (
                      <span>
                        <i className="fas fa-envelope me-2"></i>
                        {profilePreview.mail_id}
                      </span>
                    )}
                    {profilePreview.phone && (
                      <span>
                        <i className="fas fa-phone me-2"></i>
                        {profilePreview.phone}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted">Select a student to view their profile.</p>
          )}
        </Offcanvas.Body>
      </Offcanvas>
      <style jsx>{`
        .main-content {
          min-height: calc(100vh - 72px);
          background: radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 45%),
            radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.08), transparent 45%),
            linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
        }
        .student-portal-card {
          border-radius: 1.5rem;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(15, 23, 42, 0.12);
          border: none;
        }
        .student-portal-card .card-header {
          position: relative;
          background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%);
          border: none;
        }
        .student-portal-card .card-header::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.28), transparent 55%);
          pointer-events: none;
        }
        .student-portal-card .card-body {
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }
        .portal-sections {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }
        .portal-section {
          background: #ffffff;
          border-radius: 1.25rem;
          border: 1px solid rgba(148, 163, 184, 0.16);
          padding: 1.75rem;
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .portal-section:hover {
          transform: translateY(-4px);
          box-shadow: 0 30px 60px rgba(15, 23, 42, 0.08);
        }
        .portal-section-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .portal-section-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #2563eb 0%, #38bdf8 100%);
          color: #ffffff;
          font-size: 1.25rem;
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.25);
        }
        .portal-section-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: 0.01em;
        }
        .portal-section-subtitle {
          font-size: 0.9rem;
        }
        .student-portal-form .form-label {
          font-weight: 600;
          color: #1f2937;
        }
        .student-portal-form .form-control,
        .student-portal-form .form-select {
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          background-color: #f8fafc;
          border: 1px solid rgba(148, 163, 184, 0.35);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }
        .student-portal-form .form-control[readonly] {
          background-color: #f1f5f9;
          border-style: dashed;
          cursor: default;
        }
        .student-portal-form .form-control:focus,
        .student-portal-form .form-select:focus {
          box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.15);
          border-color: #2563eb;
          background-color: #ffffff;
        }
        .student-portal-form .form-select:disabled,
        .student-portal-form .form-control:disabled {
          background-color: #edf2f7;
          cursor: not-allowed;
        }
        .student-portal-form .form-check-input {
          width: 3rem;
          height: 1.5rem;
          border-radius: 1.5rem;
          border: 1px solid rgba(37, 99, 235, 0.4);
          background-color: rgba(148, 163, 184, 0.3);
        }
        .student-portal-form .form-check-input:checked {
          background-color: #2563eb;
        }
        .student-portal-form .form-check-input:focus {
          box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.2);
        }
        .student-portal-form .form-check-label {
          font-weight: 600;
          color: #1f2937;
        }
        .thank-you-state {
          max-width: 560px;
          margin: 0 auto;
        }
        .thank-you-icon {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(139, 92, 246, 0.1));
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.2);
        }
        .thank-you-state .btn {
          min-width: 200px;
        }
        .community-hero-card {
          background: linear-gradient(135deg, #1d4ed8 0%, #9333ea 100%);
          border-radius: 1.25rem;
          position: relative;
          overflow: hidden;
          color: #fff;
        }
        .portal-auth-grid {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(236, 72, 153, 0.05));
          border-radius: 1.5rem;
          padding: 1.5rem;
        }
        .portal-auth-hero {
          background: #ffffff;
          border-radius: 1.25rem;
          padding: 2rem;
          border: 1px solid rgba(148, 163, 184, 0.24);
          box-shadow: 0 22px 44px rgba(15, 23, 42, 0.08);
        }
        .portal-auth-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          color: #1f2937;
          font-weight: 500;
        }
        .portal-auth-card {
          background: #ffffff;
          border-radius: 1.25rem;
          padding: 2rem 2.5rem;
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
        }
        .portal-auth-submit {
          border-radius: 0.9rem;
          padding: 0.85rem 1.25rem;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          border: none;
          font-weight: 600;
        }
        .portal-auth-submit:hover {
          background: linear-gradient(135deg, #1e40af 0%, #6d28d9 100%);
        }
        .community-hero-card .card-body {
          position: relative;
          z-index: 1;
        }
        .community-hero-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.35), transparent 60%);
          opacity: 0.85;
          z-index: 0;
        }
        .community-search-card,
        .community-inbox-card {
          border-radius: 1.25rem;
        }
        .conversation-thread-list .list-group-item {
          border: none;
          border-radius: 1rem;
          margin-bottom: 0.5rem;
          background: rgba(248, 250, 252, 0.9);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .conversation-thread-list .list-group-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
        }
        .conversation-thread-name {
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .conversation-thread-name:hover {
          color: #2563eb;
        }
        .conversation-avatar {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(147, 51, 234, 0.12));
          color: #1e3a8a;
          font-weight: 700;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          text-transform: uppercase;
        }
        .conversation-avatar-sm {
          width: 44px;
          height: 44px;
        }
        .portal-action-ribbon {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(236, 72, 153, 0.06));
          padding: 1.25rem;
          border-radius: 1.2rem;
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }
        .ribbon-action {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          background: #ffffff;
          border: none;
          border-radius: 1rem;
          padding: 0.9rem 1rem;
          text-align: left;
          box-shadow: 0 16px 32px rgba(15, 23, 42, 0.05);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          position: relative;
        }
        .ribbon-action:hover {
          transform: translateY(-3px);
          box-shadow: 0 24px 40px rgba(15, 23, 42, 0.08);
        }
        .ribbon-action.is-active {
          border: 1px solid rgba(37, 99, 235, 0.35);
          box-shadow: 0 20px 35px rgba(37, 99, 235, 0.12);
        }
        .ribbon-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 14px;
          font-size: 1rem;
        }
        .ribbon-label {
          display: block;
          font-weight: 600;
          color: #0f172a;
        }
        .ribbon-subtitle {
          display: block;
          font-size: 0.82rem;
          color: #64748b;
        }
        .ribbon-badge {
          margin-left: auto;
          font-size: 0.75rem;
          font-weight: 600;
          color: #2563eb;
        }
        .ribbon-badge-accent {
          background: #2563eb;
          color: #ffffff;
          padding: 0.2rem 0.65rem;
          border-radius: 999px;
        }
        .contact-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border: none;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.08);
          color: #1e3a8a;
          padding: 0.35rem 0.9rem;
          font-size: 0.8rem;
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .contact-chip:hover {
          background: rgba(37, 99, 235, 0.12);
          transform: translateY(-1px);
        }
        .help-request-card {
          border-radius: 1.2rem;
          border: 1px solid rgba(148, 163, 184, 0.16);
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
        }
        .help-response {
          background: rgba(248, 250, 252, 0.85);
        }
        .help-response-main {
          align-items: flex-start;
        }
        .help-response-message {
          line-height: 1.5;
        }
        .help-response-actions {
          width: 100%;
          align-items: flex-start;
        }
        .help-response-actions .thread-presence {
          justify-content: flex-start;
        }
        .message-helper-btn {
          border-radius: 0.75rem;
        }
        @media (min-width: 768px) {
          .help-response-actions {
            width: auto;
            align-items: flex-end;
          }
        }
        @media (max-width: 767px) {
          .message-helper-btn {
            width: 100%;
          }
        }
        .conversation-offcanvas {
          width: min(420px, 100%);
        }
        .conversation-title-block {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .conversation-title {
          font-weight: 700;
          font-size: 1.05rem;
          color: #0f172a;
        }
        .conversation-status {
          font-size: 0.82rem;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .conversation-status.is-online {
          color: #16a34a;
        }
        .profile-offcanvas {
          width: min(400px, 100%);
          background: linear-gradient(180deg, #1f2937 0%, #0f172a 100%);
          color: #e2e8f0;
        }
        .profile-offcanvas .offcanvas-body {
          background: transparent;
        }
        .profile-offcanvas .offcanvas-header {
          background: transparent;
          color: #e2e8f0;
        }
        .profile-offcanvas .btn-close {
          filter: invert(1);
        }
        .profile-preview h6 {
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          margin-bottom: 0.6rem;
        }
        .profile-preview-section {
          margin-bottom: 1.5rem;
          padding-bottom: 0.9rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        }
        .profile-preview-section:last-of-type {
          border-bottom: none;
        }
        .presence-dot {
          width: 0.55rem;
          height: 0.55rem;
          border-radius: 50%;
          background: #cbd5f5;
          display: inline-block;
        }
        .presence-dot-online,
        .conversation-status.is-online .presence-dot {
          background: #16a34a;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15);
        }
        .presence-line,
        .thread-presence {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .conversation-clear {
          border-radius: 0.75rem;
          border: 1px solid rgba(148, 163, 184, 0.4);
          color: #1e293b;
        }
        .conversation-clear:hover {
          background: rgba(148, 163, 184, 0.2);
          color: #0f172a;
        }
        .conversation-messages {
          background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
          border-radius: 1rem;
          padding: 1.25rem;
          overflow-y: auto;
          max-height: 55vh;
        }
        .conversation-message {
          margin-bottom: 1rem;
          max-width: 90%;
        }
        .conversation-message--self {
          margin-left: auto;
          text-align: right;
        }
        .conversation-message-meta {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 0.35rem;
          gap: 0.75rem;
        }
        .conversation-message-author {
          font-weight: 600;
        }
        .conversation-message-bubble {
          display: inline-block;
          padding: 0.65rem 0.95rem;
          border-radius: 1rem;
          background: #eff6ff;
          color: #1e40af;
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.12);
        }
        .conversation-message--self .conversation-message-bubble {
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.22);
        }
        .community-name-link {
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .community-name-link:hover {
          color: #2563eb;
        }
        .community-card {
          border-radius: 1.25rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .community-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 26px 45px rgba(15, 23, 42, 0.08);
        }
        .community-contact {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .portal-mobile-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(12px);
          padding: 0.65rem 1.25rem env(safe-area-inset-bottom, 1rem);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          z-index: 1050;
        }
        .portal-mobile-nav button {
          border: none;
          background: transparent;
          color: #cbd5f5;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 0.7rem;
          gap: 0.25rem;
          position: relative;
        }
        .portal-mobile-nav button .icon-wrapper {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .portal-mobile-nav button .badge {
          position: absolute;
          top: 2px;
          right: 20px;
          font-size: 0.65rem;
        }
        .portal-mobile-nav button.active .icon-wrapper {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }
        .portal-mobile-nav button.active {
          color: #fff;
        }
        @media (max-width: 767px) {
          .student-portal-card {
            border-radius: 1.25rem;
          }
          .portal-section {
            padding: 1.3rem;
          }
          .portal-section-header {
            align-items: flex-start;
          }
          .portal-action-ribbon {
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            padding: 1rem;
          }
          .ribbon-action {
            padding: 0.75rem 0.85rem;
          }
          .portal-auth-grid {
            padding: 1rem;
          }
          .portal-auth-card {
            padding: 1.5rem;
          }
          .portal-auth-hero {
            padding: 1.5rem;
          }
        }
        @media (min-width: 992px) {
          .portal-mobile-nav {
            display: none;
          }
        }
      `}</style>
    </>
  );
}

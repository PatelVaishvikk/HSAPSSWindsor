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
  ToastContainer,
  Dropdown
} from 'react-bootstrap';
import { io } from 'socket.io-client';
import { STUDENT_PORTAL_FIELD_DEFS, STUDENT_PORTAL_FIELD_NAMES } from '../config/studentPortalFields.js';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { useFeed } from '../hooks/useFeed';

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

export default function StudentPortalPage({ initialStudent, initialPortalMeta }) {
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [student, setStudent] = useState(initialStudent || null);
  
  const [formData, setFormData] = useState(() => {
    const base = buildInitialFormState();
    if (initialStudent) {
      STUDENT_PORTAL_FIELD_NAMES.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(initialStudent, field)) {
          base[field] = initialStudent[field] ?? (field === 'graduation_completed' ? false : '');
        }
      });
    }
    return base;
  });

  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);
  const [sessionPassword, setSessionPassword] = useState('');
  const [portalMeta, setPortalMeta] = useState(initialPortalMeta || {
    has_custom_password: false,
    used_default_password: false,
    can_access_admin: false,
    admin_shortcuts: []
  });
  const [activePane, setActivePane] = useState('profile');
  const [communityProfiles, setCommunityProfiles] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [conversationStarter, setConversationStarter] = useState('');

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
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
  const portalAuthHeadersRef = useRef(null);
  const [toastQueue, setToastQueue] = useState([]);
  const [profilePreview, setProfilePreview] = useState(null);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);



  // Feed state
  const { posts: feedPosts, isLoading: feedLoading, error: feedError, mutate: mutateFeed } = useFeed();
  const [postForm, setPostForm] = useState({ content: '' });
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postComments, setPostComments] = useState({}); // { postId: [comments] }
  const [commentDrafts, setCommentDrafts] = useState({}); // { postId: text }
  const [showComments, setShowComments] = useState({}); // { postId: boolean }

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
    if (!student?._id) {
      portalAuthHeadersRef.current = null;
      return null;
    }
    const headers = {
      'X-Student-Id': student._id
    };
    if (sessionPassword) {
      headers['X-Portal-Secret'] = sessionPassword;
    }
    portalAuthHeadersRef.current = headers;
    return headers;
  }, [student?._id, sessionPassword]);

  const refreshCommunityProfiles = useCallback(
    async (searchValue = communitySearch) => {


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
            headers: portalAuthHeaders || {}
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


      setInboxLoading(true);
      setInboxError('');

      try {
        const response = await fetch('/api/student-portal/messages?limit=12', {
          method: 'GET',
          headers: portalAuthHeaders || {}
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

      // Sync ref immediately
      activeConversationRef.current = {
        id: targetId,
        first_name: base.first_name || '',
        last_name: base.last_name || ''
      };

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
    async (scopeValue) => {
      const headers = portalAuthHeadersRef.current;
      if (!headers) {
        setHelpLoading(false);
        return;
      }

      setHelpLoading(true);
      setHelpError('');

      try {
        const params = new URLSearchParams();
        params.set('scope', scopeValue || helpScopeRef.current || 'open');
        const url = `/api/student-portal/help-requests?${params.toString()}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Unable to load help board right now.');
        }
        
        const requests = Array.isArray(data.requests) ? data.requests : [];
        setHelpRequests(requests);
      } catch (error) {
        console.error('[HELP] Student help board fetch failed:', error);
        setHelpError(error.message || 'Unable to load help board right now.');
      } finally {
        setHelpLoading(false);
      }
    },
    [] // No dependencies - uses refs only
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
      
      if (!request) {
        return;
      }

      const ownerId = request.student?.id;

      // Update local state based on the event type instead of full refresh
      if (payload.type === 'request:new') {
        // Add new request to the list if it matches current scope
        if (helpScopeRef.current === 'open' && request.status === 'open') {
          setHelpRequests((prev) => {
            // Check if request already exists
            if (prev.some(r => r.id === request.id)) {
              return prev;
            }
            return [request, ...prev];
          });
        }
        
        // Show toast if it's from someone else
        if (ownerId && ownerId !== viewerId) {
          enqueueToast({
            variant: 'info',
            title: 'New help request',
            message: request.title,
            actionLabel: 'View board',
            onAction: () => setActivePane('help')
          });
        }
      } else if (payload.type === 'request:response') {
        // Update the specific request with new response
        setHelpRequests((prev) =>
          prev.map((item) => (item.id === request.id ? request : item))
        );
        
        // Show toast if it's your request
        if (ownerId && ownerId === viewerId) {
          enqueueToast({
            variant: 'success',
            title: 'New response received',
            message: `Someone replied to "${request.title}"`,
            actionLabel: 'Open board',
            onAction: () => setActivePane('help')
          });
        }
      } else if (payload.type === 'request:closed' || payload.type === 'request:resolved') {
        // Remove from open requests or update status
        if (helpScopeRef.current === 'open') {
          setHelpRequests((prev) => prev.filter((item) => item.id !== request.id));
        } else {
          setHelpRequests((prev) =>
            prev.map((item) => (item.id === request.id ? request : item))
          );
        }
      } else if (payload.type === 'request:deleted') {
        // Remove deleted request
        setHelpRequests((prev) => prev.filter((item) => item.id !== request.id));
      }
    },
    [enqueueToast, setActivePane, student?._id]
  );

  useEffect(() => {
    if (!student?._id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Initialize Socket.IO
    const socket = io({
      path: '/socket.io',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'] // Force websocket first
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[CHAT] Socket connected:', socket.id);
      socket.emit('student:join', { studentId: student._id });
      socket.emit('help:join');
      socket.emit('feed:join');
      console.log('[CHAT] Emitted student:join for:', student._id);
    });

    socket.on('connect_error', (err) => {
      console.error('[CHAT] Connection error:', err);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[CHAT] Socket disconnected:', reason);
    });

    socket.on('community:message', (data) => {
      console.log('[CHAT] Received community:message:', data);
      handleIncomingMessage(data);
    });
    socket.on('community:message:sent', () => refreshInboxThreads());
    socket.on('community:conversation', handleConversationEvent);
    socket.on('help:update', handleRealtimeHelpUpdate);
    socket.on('post:new', (data) => {
      if (data?.post) {
        mutateFeed((current) => ({
          ...current,
          posts: [data.post, ...(current?.posts || [])]
        }), false);
      }
    });
    socket.on('post:like', (data) => {
      if (data?.postId) {
        mutateFeed((current) => ({
          ...current,
          posts: (current?.posts || []).map((post) =>
            post.id === data.postId ? { ...post, likes: data.likes } : post
          )
        }), false);
      }
    });
    socket.on('post:comment', (data) => {
      if (data?.comment) {
        const postId = data.comment.post;
        setPostComments((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment]
        }));
        mutateFeed((current) => ({
          ...current,
          posts: (current?.posts || []).map((post) =>
            post.id === postId ? { ...post, comments: (post.comments || 0) + 1 } : post
          )
        }), false);
      }
    });

    refreshInboxThreads();
    refreshHelpRequests(); // Now safe to call - uses refs, won't cause infinite loop

    return () => {
      socket.off('community:message', handleIncomingMessage);
      socket.off('community:message:sent');
      socket.off('community:conversation', handleConversationEvent);
      socket.off('help:update', handleRealtimeHelpUpdate);
      socket.off('post:new');
      socket.off('post:like');
      socket.off('post:comment');
      socket.disconnect();
      socketRef.current = null;
      console.log('[CHAT] Socket disconnected on cleanup');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?._id, handleIncomingMessage, handleConversationEvent, handleRealtimeHelpUpdate, refreshInboxThreads]);


  // Load feed when feed pane is active - Handled by useFeed hook

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



    try {
      const response = await fetch('/api/student-portal/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(portalAuthHeaders || {})
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
        message: draft,
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
      console.warn('[CHAT] Cannot clear conversation: No active conversation ID');
      return;
    }

    console.log('[CHAT] Clearing conversation with:', activeConversation.id);
    setConversationError('');
    
    // Immediate feedback
    enqueueToast({
      variant: 'primary',
      title: 'Processing',
      message: 'Clearing conversation history...'
    });

    try {
      const response = await fetch(`/api/student-portal/messages?with=${activeConversation.id}`, {
        method: 'DELETE',
        headers: portalAuthHeaders || {}
      });

      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to clear conversation');
      }

      console.log('[CHAT] Conversation cleared successfully');
      setConversationMessages([]);
      
      enqueueToast({
        variant: 'success',
        title: 'Conversation cleared',
        message: `History with ${activeConversation.first_name || 'this student'} has been cleared.`
      });
      
      setMessageDraft('');
      refreshInboxThreads();
    } catch (error) {
      console.error('[CHAT] Clear conversation failed:', error);
      setConversationError(error.message || 'Unable to clear conversation');
      enqueueToast({
        variant: 'danger',
        title: 'Error',
        message: error.message || 'Failed to clear conversation'
      });
    }
  };

  const handleCloseConversation = () => {
    setShowConversationPanel(false);
    setActiveConversation(null);
    activeConversationRef.current = null;
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

  // Feed handlers

  const handlePostSubmit = async (event) => {
    event.preventDefault();
    if (!postForm.content.trim()) {
      return;
    }
    setPostSubmitting(true);
    // setFeedError(''); // Handled by SWR error
    try {
      const response = await fetch('/api/student-portal/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(portalAuthHeaders || {})
        },
        body: JSON.stringify({ content: postForm.content })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to create post');
      }
      mutateFeed(); // Revalidate feed
      setPostForm({ content: '' });
    } catch (error) {
      console.error('Post creation failed:', error);
      // setFeedError(error.message || 'Unable to create post');
      enqueueToast({ variant: 'danger', title: 'Error', message: error.message || 'Unable to create post' });
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleLikePost = async (postId) => {
    // Optimistic update
    mutateFeed((currentData) => {
      if (!currentData?.posts) return currentData;
      return {
        ...currentData,
        posts: currentData.posts.map((post) => {
          if (post.id === postId) {
            const newIsLiked = !post.is_liked;
            return {
              ...post,
              is_liked: newIsLiked,
              likes: newIsLiked ? (post.likes || 0) + 1 : Math.max(0, (post.likes || 0) - 1)
            };
          }
          return post;
        })
      };
    }, { revalidate: false });

    try {
      const response = await fetch('/api/student-portal/post-actions?action=like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(portalAuthHeaders || {})
        },
        body: JSON.stringify({ postId })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to like post');
      }
      mutateFeed(); // Revalidate to ensure consistency
    } catch (error) {
      console.error('Like post failed:', error);
      mutateFeed(); // Revert on error
    }
  };

  const handleLoadComments = async (postId) => {
    if (showComments[postId]) {
      // Toggle off
      setShowComments((prev) => ({ ...prev, [postId]: false }));
      return;
    }
    try {
      const response = await fetch(`/api/student-portal/post-actions?action=comment&postId=${postId}`, {
        headers: {
          ...(portalAuthHeaders || {})
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to load comments');
      }
      setPostComments((prev) => ({ ...prev, [postId]: data.comments || [] }));
      setShowComments((prev) => ({ ...prev, [postId]: true }));
    } catch (error) {
      console.error('Load comments failed:', error);
    }
  };

  const handleCommentSubmit = async (postId) => {
    const content = commentDrafts[postId]?.trim();
    if (!content) {
      return;
    }
    try {
      const response = await fetch('/api/student-portal/post-actions?action=comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(portalAuthHeaders || {})
        },
        body: JSON.stringify({ postId, content })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to add comment');
      }
      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data.comment]
      }));
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
      // Update comment count
      mutateFeed();
    } catch (error) {
      console.error('Comment submission failed:', error);
    }
  };

  const handleSharePost = async (postId) => {
    try {
      const response = await fetch('/api/student-portal/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(portalAuthHeaders || {})
        },
        body: JSON.stringify({ shared_from: postId, content: '' })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to share post');
      }
      mutateFeed();
      enqueueToast({
        variant: 'success',
        title: 'Post Shared',
        message: 'The post has been shared to your feed'
      });
    } catch (error) {
      console.error('Share post failed:', error);
      enqueueToast({
        variant: 'danger',
        title: 'Share Failed',
        message: error.message || 'Unable to share post'
      });
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }
    try {
      const response = await fetch(`/api/student-portal/posts?postId=${postId}`, {
        method: 'DELETE',
        headers: {
          ...(portalAuthHeaders || {})
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to delete post');
      }
      mutateFeed();
    } catch (error) {
      console.error('Delete post failed:', error);
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
    console.log('[CLIENT] handleLogin called');
    event.preventDefault();
    console.log('[CLIENT] Form submission prevented, starting login...');
    setErrorMessage('');
    setSuccessMessage('');
    setLoginLoading(true);

    // Safety timeout to ensure loading state resets even if fetch hangs
    const safetyTimeout = setTimeout(() => {
      console.log('[CLIENT] Safety timeout triggered - resetting loading state');
      setLoginLoading(false);
      setErrorMessage('Login request timed out. Please try again or refresh the page.');
    }, 15000);

    try {
      console.log('[CLIENT] About to fetch login API...');
      const response = await fetch('/api/student-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loginPhone,
          password: loginPassword
        })
      });
      console.log('[CLIENT] Fetch completed, response status:', response.status);
      
      clearTimeout(safetyTimeout);

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to log in');
      }

      const normalizedForm = buildInitialFormState();
      const studentData = data.student || {};
      const meta = data.meta || {};

      // Pre-fill form with existing data
      Object.keys(normalizedForm).forEach((key) => {
        if (studentData[key] !== undefined && studentData[key] !== null) {
          normalizedForm[key] = studentData[key];
        }
      });

      setStudent(studentData);
      setFormData(normalizedForm);
      setPortalMeta(meta);
      
      // Reset auth fields
      setLoginPhone('');
      setLoginPassword(meta.used_default_password ? '' : DEFAULT_PASSWORD);
      setSessionPassword(loginPassword); // Store for session usage
      
      // Reset other states
      setAuthMode('login');
      setActivePane('profile');
      setCommunityInitialized(false);
      setInboxInitialized(false);
      
      setSuccessMessage(
        'Welcome back! Update your details below and save your changes when you are done.'
      );
    } catch (error) {
      clearTimeout(safetyTimeout);
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
    // if (!sessionPassword) {
    //   setErrorMessage('Your session has expired. Please log in again.');
    //   return;
    // }

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

  const renderFeedPane = () => (
    <div className="feed-pane">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h5 className="fw-semibold mb-1">Community Feed</h5>
          <p className="text-muted small mb-0">
            Share updates, thoughts, and connect with the community.
          </p>
        </div>
      </div>

      {feedError && (
        <Alert variant="danger" className="mb-4">
          {feedError}
        </Alert>
      )}

      {/* Post Creation Form */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <h6 className="fw-semibold mb-3">
            <i className="fas fa-edit me-2 text-primary"></i>
            Create a Post
          </h6>
          <Form onSubmit={handlePostSubmit}>
            <Form.Group className="mb-3">
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="What's on your mind?"
                value={postForm.content}
                onChange={(e) => setPostForm({ content: e.target.value })}
                required
              />
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button type="submit" variant="primary" disabled={postSubmitting || !postForm.content.trim()}>
                {postSubmitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" role="status" />
                    Posting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane me-2"></i>
                    Post
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* Feed */}
      {feedLoading && feedPosts.length === 0 ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" className="text-primary" />
          <p className="text-muted small mt-3 mb-0">Loading feed...</p>
        </div>
      ) : feedPosts.length === 0 ? (
        <div className="text-center py-5">
          <div className="empty-state-icon mb-3">
            <i className="fas fa-rss"></i>
          </div>
          <h6 className="fw-semibold mb-2">No posts yet</h6>
          <p className="text-muted small mb-0">
            Be the first to share something with the community!
          </p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {feedPosts.map((post) => (
            <Card key={post.id} className="border-0 shadow-sm post-card">
              <Card.Body>
                {/* Post Header */}
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="d-flex gap-3 flex-grow-1">
                    <div className="conversation-avatar conversation-avatar-sm flex-shrink-0">
                      {buildInitials(post.author?.first_name, post.author?.last_name)}
                    </div>
                    <div className="flex-grow-1">
                      <h6 className="fw-bold mb-0">
                        {post.author?.first_name} {post.author?.last_name}
                      </h6>
                      {post.author?.study && (
                        <p className="text-muted small mb-0">{post.author.study}</p>
                      )}
                      <p className="text-muted small mb-0">
                        {formatConversationTimestamp(post.created_at)}
                      </p>
                    </div>
                  </div>
                  {post.is_owner && (
                    <Dropdown align="end">
                      <Dropdown.Toggle variant="link" className="text-muted border-0 p-0 no-arrow">
                        <i className="fas fa-ellipsis-v"></i>
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item onClick={() => handleDeletePost(post.id)} className="text-danger">
                          <i className="fas fa-trash-alt me-2"></i>
                          Delete Post
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  )}
                </div>

                {/* Post Content */}
                {post.shared_from && (
                  <div className="mb-2">
                    <Badge bg="info" text="dark" className="mb-2">
                      <i className="fas fa-retweet me-1"></i>
                      Shared
                    </Badge>
                  </div>
                )}
                <p className="mb-3">{post.content}</p>

                {/* Shared Post */}
                {post.shared_from && (
                  <Card className="border mb-3 bg-light">
                    <Card.Body className="p-3">
                      <div className="small fw-semibold mb-1">
                        {post.shared_from.author?.first_name} {post.shared_from.author?.last_name}
                      </div>
                      <p className="small mb-0">{post.shared_from.content}</p>
                    </Card.Body>
                  </Card>
                )}

                {/* Post Actions */}
                <div className="border-top pt-2 mt-2">
                  <div className="d-flex gap-3 mb-2">
                    <Button
                      variant="link"
                      size="sm"
                      className={`text-decoration-none d-flex align-items-center gap-1 ${post.is_liked ? 'text-danger' : 'text-muted'}`}
                      onClick={() => handleLikePost(post.id)}
                    >
                      <i className={`${post.is_liked ? 'fas' : 'far'} fa-heart`}></i>
                      <span>{post.likes || 0}</span>
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-decoration-none text-muted d-flex align-items-center gap-1"
                      onClick={() => handleLoadComments(post.id)}
                    >
                      <i className="far fa-comment"></i>
                      <span>{post.comments || 0}</span>
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-decoration-none text-muted d-flex align-items-center gap-1"
                      onClick={() => handleSharePost(post.id)}
                    >
                      <i className="fas fa-retweet"></i>
                      <span>Share</span>
                    </Button>
                  </div>

                  {/* Comments Section */}
                  {showComments[post.id] && (
                    <div className="border-top pt-3 mt-2">
                      {postComments[post.id]?.length > 0 && (
                        <div className="mb-3">
                          {postComments[post.id].map((comment) => (
                            <div key={comment.id} className="d-flex gap-2 mb-2">
                              <div className="conversation-avatar conversation-avatar-xs flex-shrink-0">
                                {buildInitials(comment.author?.first_name, comment.author?.last_name)}
                              </div>
                              <div className="flex-grow-1 bg-light p-2 rounded">
                                <div className="fw-semibold small">
                                  {comment.author?.first_name} {comment.author?.last_name}
                                </div>
                                <div className="small">{comment.content}</div>
                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                  {formatConversationTimestamp(comment.created_at)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <Form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleCommentSubmit(post.id);
                        }}
                      >
                        <div className="d-flex gap-2">
                          <Form.Control
                            type="text"
                            size="sm"
                            placeholder="Write a comment..."
                            value={commentDrafts[post.id] || ''}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                          />
                          <Button type="submit" variant="primary" size="sm">
                            <i className="fas fa-paper-plane"></i>
                          </Button>
                        </div>
                      </Form>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
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
                    {request.responses?.length > 0 && (
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <i className="fas fa-comment-dots text-success"></i>
                        <span className="fw-semibold text-success">
                          {request.responses.length} {request.responses.length === 1 ? 'response' : 'responses'}
                        </span>
                      </div>
                    )}
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

      <div className="d-flex flex-column flex-lg-row min-vh-100">
        {/* Mobile Header */}
        <div className="d-lg-none bg-white border-bottom p-3 d-flex align-items-center justify-content-between sticky-top shadow-sm">
          <div className="d-flex align-items-center gap-3">
            <div className="portal-logo-sm rounded-circle overflow-hidden d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
              <img src="/windsor.jpg" alt="Logo" className="w-100 h-100 object-fit-cover" />
            </div>
            <span className="fw-bold text-dark">HSAPSS Portal</span>
          </div>
          {student && (
            <Button variant="light" size="sm" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt text-danger"></i>
            </Button>
          )}
        </div>


        {/* Sidebar Navigation (Desktop Only) */}
        <div className="d-none d-lg-block">
          {student && (
            <div className="d-flex flex-column sidebar-modern position-fixed h-100" style={{ width: 280, zIndex: 1000, top: 0, left: 0, overflow: 'hidden' }}>
              {/* Header */}
              <div className="p-4 pb-2 flex-shrink-0">
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-3 overflow-hidden shadow-sm" style={{ width: 48, height: 48 }}>
                    <img src="/windsor.jpg" alt="HSAPSS Logo" className="w-100 h-100 object-fit-cover" />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0 text-dark">HSAPSS</h5>
                    <small className="text-muted">Student Portal</small>
                  </div>
                </div>
              </div>

            {/* Scrollable Navigation */}
            <div className="flex-grow-1 overflow-y-auto custom-scrollbar px-3 py-2" style={{ minHeight: 0 }}>
              <div className="d-flex flex-column gap-2">
                <Button
                  variant="link"
                  className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${activePane === 'profile' ? 'active' : ''}`}
                  onClick={() => setActivePane('profile')}
                >
                  <i className={`fas fa-user-circle ${activePane === 'profile' ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
                  <span>My Profile</span>
                </Button>

                <Button
                  variant="link"
                  className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${activePane === 'community' ? 'active' : ''}`}
                  onClick={() => setActivePane('community')}
                >
                  <i className={`fas fa-users ${activePane === 'community' ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
                  <span>Community Hub</span>
                </Button>

                <Button
                  variant="link"
                  className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${activePane === 'help' ? 'active' : ''}`}
                  onClick={() => setActivePane('help')}
                >
                  <i className={`fas fa-hands-helping ${activePane === 'help' ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
                  <span>Help Board</span>
                </Button>

                <Button
                  variant="link"
                  className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${activePane === 'feed' ? 'active' : ''}`}
                  onClick={() => setActivePane('feed')}
                >
                  <i className={`fas fa-rss ${activePane === 'feed' ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
                  <span>Feed</span>
                </Button>

                {portalMeta.can_access_admin && (
                  <div className="mt-4">
                    <Button
                      variant="link"
                      className={`text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 border-0 text-decoration-none nav-btn ${activePane === 'analytics' ? 'active' : ''}`}
                      onClick={() => setActivePane('analytics')}
                    >
                      <i className={`fas fa-chart-line ${activePane === 'analytics' ? '' : 'text-muted'}`} style={{ width: 24 }}></i>
                      <span>Analytics</span>
                    </Button>
                    <div className="text-uppercase text-muted fw-bold small px-3 mb-2 mt-3" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>Admin Tools</div>
                    {portalMeta.admin_shortcuts.map((shortcut, idx) => (
                      <Button
                        key={idx}
                        variant="light"
                        href={shortcut.href}
                        className="text-start d-flex align-items-center gap-3 px-3 py-2 rounded-3 border-0 bg-transparent w-100 text-dark mb-1 nav-btn"
                      >
                        <i className={`${shortcut.icon} text-primary`} style={{ width: 24 }}></i>
                        <span>{shortcut.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 pt-3 border-top flex-shrink-0 bg-white">
              <div className="d-flex align-items-center gap-3 px-2 mb-3">
                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold" style={{ width: 40, height: 40 }}>
                  {buildInitials(student?.first_name, student?.last_name)}
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-truncate text-dark">{student?.first_name}</div>
                  <div className="small text-muted text-truncate">{student?.phone}</div>
                </div>
              </div>
              <Button variant="light" className="w-100 border-0 text-danger bg-danger bg-opacity-10 hover-danger" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt me-2"></i>
                Sign Out
              </Button>
            </div>
            <div className="pb-5"></div>
          </div>
          )}
        </div>


        {/* Main Content Area */}
        <div className={`flex-grow-1 ${student ? 'ms-lg-auto' : ''}`} style={{ marginLeft: 0, width: '100%' }}>
          <div className="container-fluid p-0">
            {student && (
              <div className="d-lg-none p-2 d-flex gap-2 bg-white border-top position-fixed bottom-0 start-0 end-0 justify-content-around" style={{ zIndex: 900 }}>
                {['profile', 'community', 'help', 'feed'].map(pane => (
                  <Button
                    key={pane}
                    variant={activePane === pane ? 'primary' : 'light'}
                    size="sm"
                    className={`flex-grow-1 d-flex flex-column align-items-center gap-1 border-0 ${activePane === pane ? 'btn-primary' : 'btn-light'}`}
                    onClick={() => setActivePane(pane)}
                    style={{ minHeight: '56px' }}
                  >
                    <i className={`fas fa-${pane === 'profile' ? 'user' : pane === 'community' ? 'users' : pane === 'help' ? 'hands-helping' : 'rss'}`}></i>
                    <span style={{ fontSize: '0.7rem' }}>{pane.charAt(0).toUpperCase() + pane.slice(1)}</span>
                  </Button>
                ))}
              </div>
            )}

            <div className="p-3 p-lg-5" style={{ maxWidth: 1200, marginLeft: 'auto', marginRight: 'auto' }}>
              {/* Content Render */}
              <div className="fade-in-up">
                {!student ? (
                   <div className="row justify-content-center align-items-center min-vh-100" style={{ minHeight: '80vh' }}>
                     <div className="col-lg-10">
                       <div className="row align-items-center g-5">
                         <div className="col-lg-5 order-lg-2">
                            <div className="text-center text-lg-start mb-4 mb-lg-0">
                              <div className="d-inline-flex align-items-center justify-content-center bg-white p-3 rounded-4 shadow-sm mb-4">
                                <i className="fas fa-graduation-cap fa-3x text-primary"></i>
                              </div>
                              <h1 className="fw-bold display-5 mb-3 text-dark">HSAPSS Windsor</h1>
                              <p className="lead text-muted mb-4">
                                A single space for every Windsor yuvak's journey. Connect, grow, and support each other.
                              </p>
                              <div className="d-flex flex-column gap-3">
                                <div className="d-flex align-items-center gap-3">
                                  <div className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                                    <i className="fas fa-check fa-sm"></i>
                                  </div>
                                  <span className="text-muted">Update once, stay connected forever</span>
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                  <div className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                                    <i className="fas fa-check fa-sm"></i>
                                  </div>
                                  <span className="text-muted">Find tailored help and resources</span>
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                  <div className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                                    <i className="fas fa-check fa-sm"></i>
                                  </div>
                                  <span className="text-muted">Mentor incoming students</span>
                                </div>
                              </div>
                            </div>
                         </div>
                         <div className="col-lg-7 order-lg-1">
                           <div className="card-modern p-4 p-lg-5">
                             <div className="d-flex justify-content-between align-items-center mb-4">
                               <h3 className="fw-bold mb-0">
                                 {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                               </h3>
                               <Button
                                variant="light"
                                size="sm"
                                className="text-primary fw-semibold"
                                onClick={() => switchAuthMode(authMode === 'login' ? 'register' : 'login')}
                               >
                                 {authMode === 'login' ? 'Create Account' : 'Sign In'}
                               </Button>
                             </div>
                             
                             {errorMessage && (
                               <Alert variant="danger" className="border-0 bg-danger bg-opacity-10 text-danger mb-4">
                                 <i className="fas fa-exclamation-circle me-2"></i>
                                 {errorMessage}
                               </Alert>
                             )}

                             {successMessage && (
                               <Alert variant="success" className="border-0 bg-success bg-opacity-10 text-success mb-4">
                                 <i className="fas fa-check-circle me-2"></i>
                                 {successMessage}
                               </Alert>
                             )}

                             {authMode === 'login' ? (
                               <Form onSubmit={handleLogin}>
                                 <Form.Group className="mb-3" controlId="login-phone">
                                   <Form.Label className="fw-semibold small text-muted text-uppercase">Phone Number</Form.Label>
                                   <Form.Control
                                     type="tel"
                                     size="lg"
                                     placeholder="Enter your phone number"
                                     value={loginPhone}
                                     onChange={(e) => setLoginPhone(e.target.value)}
                                     required
                                     className="bg-light border-0"
                                   />
                                 </Form.Group>
                                 <Form.Group className="mb-4" controlId="login-password">
                                   <Form.Label className="fw-semibold small text-muted text-uppercase">Password</Form.Label>
                                   <Form.Control
                                     type="password"
                                     size="lg"
                                     placeholder="Enter your password"
                                     value={loginPassword}
                                     onChange={(e) => setLoginPassword(e.target.value)}
                                     required
                                     className="bg-light border-0"
                                   />
                                 </Form.Group>
                                 <Button type="submit" variant="primary" size="lg" className="w-100 fw-bold" disabled={loginLoading}>
                                   {loginLoading ? <Spinner size="sm" animation="border" /> : 'Sign In'}
                                 </Button>
                               </Form>
                             ) : (
                               <Form onSubmit={handleRegister}>
                                 <Form.Group className="mb-3" controlId="register-phone">
                                   <Form.Label className="fw-semibold small text-muted text-uppercase">Phone Number</Form.Label>
                                   <Form.Control
                                     type="tel"
                                     size="lg"
                                     placeholder="Enter your phone number"
                                     value={registerPhone}
                                     onChange={(e) => setRegisterPhone(e.target.value)}
                                     required
                                     className="bg-light border-0"
                                   />
                                 </Form.Group>
                                 <div className="row g-3 mb-4">
                                   <div className="col-md-6">
                                      <Form.Group controlId="register-password">
                                        <Form.Label className="fw-semibold small text-muted text-uppercase">Password</Form.Label>
                                        <Form.Control
                                          type="password"
                                          size="lg"
                                          placeholder="8+ chars"
                                          value={registerPassword}
                                          onChange={(e) => setRegisterPassword(e.target.value)}
                                          required
                                          minLength={8}
                                          className="bg-light border-0"
                                        />
                                      </Form.Group>
                                   </div>
                                   <div className="col-md-6">
                                      <Form.Group controlId="register-confirm">
                                        <Form.Label className="fw-semibold small text-muted text-uppercase">Confirm</Form.Label>
                                        <Form.Control
                                          type="password"
                                          size="lg"
                                          placeholder="Repeat password"
                                          value={registerConfirm}
                                          onChange={(e) => setRegisterConfirm(e.target.value)}
                                          required
                                          minLength={8}
                                          className="bg-light border-0"
                                        />
                                      </Form.Group>
                                   </div>
                                 </div>
                                 <Button type="submit" variant="primary" size="lg" className="w-100 fw-bold" disabled={registerLoading}>
                                   {registerLoading ? <Spinner size="sm" animation="border" /> : 'Create Account'}
                                 </Button>
                               </Form>
                             )}
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                ) : showThankYou ? (
                  <div className="text-center py-5">
                    <div className="mb-4">
                      <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center shadow-lg" style={{ width: 80, height: 80, fontSize: '2rem' }}>
                        <i className="fas fa-check"></i>
                      </div>
                    </div>
                    <h2 className="fw-bold mb-3">Profile Updated!</h2>
                    <p className="lead text-muted mb-4" style={{ maxWidth: 500, margin: '0 auto' }}>
                      Thanks for keeping your details current. Your profile is now up to date.
                    </p>
                    <div className="d-flex justify-content-center gap-3">
                      <Button variant="primary" onClick={() => { setShowThankYou(false); setActivePane('community'); refreshCommunityProfiles(); }}>
                        Explore Community
                      </Button>
                      <Button variant="outline-secondary" onClick={() => setShowThankYou(false)}>
                        Back to Profile
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {activePane === 'profile' && (
                      <div className="row g-4">
                        <div className="col-12">
                          <div className="d-flex align-items-center justify-content-between mb-4">
                            <div>
                              <h2 className="fw-bold mb-1 text-dark">My Profile</h2>
                              <p className="text-muted mb-0">Manage your personal information and preferences.</p>
                            </div>
                            {updateLoading && <Spinner animation="border" variant="primary" size="sm" />}
                          </div>
                        </div>
                        
                        <div className="col-lg-8">
                          <Form onSubmit={handleUpdate} className="student-portal-form" noValidate>
                            <div className="d-flex flex-column gap-4">
                              {portalSections.map((section) => (
                                <div key={section.key} className="card-modern p-4">
                                  <div className="d-flex align-items-center gap-3 mb-4 border-bottom pb-3">
                                    <div className="bg-primary bg-opacity-10 text-primary rounded-3 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                                      <i className={section.icon}></i>
                                    </div>
                                    <div>
                                      <h5 className="fw-bold mb-0 text-dark">{section.title}</h5>
                                      <small className="text-muted">{section.subtitle}</small>
                                    </div>
                                  </div>
                                  <div className="row g-4">
                                    {section.fields.map((fieldName) => {
                                      if (!workingPlan && (fieldName === 'employment_company' || fieldName === 'employment_role')) return null;
                                      const fieldConfig = FIELD_CONFIG_MAP.get(fieldName);
                                      if (!fieldConfig) return null;
                                      return (
                                        <div key={fieldName} className={getFieldColumnClass(fieldConfig)}>
                                          {renderFormControl(fieldConfig)}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="d-flex justify-content-end mt-4 pt-3 border-top">
                              <Button type="submit" variant="primary" size="lg" disabled={updateLoading} className="px-5 shadow-sm">
                                {updateLoading ? <Spinner animation="border" size="sm" /> : 'Save Changes'}
                              </Button>
                            </div>
                          </Form>
                        </div>
                        <div className="col-lg-4">
                          <div className="sticky-top" style={{ top: 20 }}>
                            {renderAccountPane()}
                          </div>
                        </div>
                      </div>
                    )}

                    {activePane === 'community' && (
                      <div className="h-100">
                        {renderCommunityPane()}
                      </div>
                    )}

                    {activePane === 'help' && (
                      <div className="h-100">
                        {renderHelpPane()}
                      </div>
                    )}

                    {activePane === 'feed' && (
                      <div className="h-100">
                        {renderFeedPane()}
                      </div>
                    )}

                    {activePane === 'analytics' && (
                      <div className="h-100">
                        <AnalyticsDashboard currentUser={student} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 2000 }}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            onClose={() => removeToast(toast.id)}
            delay={5000}
            autohide
            className="border-0 shadow-lg"
          >
            <Toast.Header className={`bg-${toast.variant} text-white border-0`}>
              <strong className="me-auto">{toast.title}</strong>
              <small>Just now</small>
            </Toast.Header>
            <Toast.Body className="bg-white rounded-bottom">{toast.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>

      {/* Offcanvas Components */}
      <Offcanvas 
        show={showConversationPanel} 
        onHide={handleCloseConversation} 
        placement="end"
        className="conversation-offcanvas border-0 shadow-lg"
        backdrop={true}
      >
        <Offcanvas.Header closeButton className="border-bottom py-3">
          <Offcanvas.Title>
            {activeConversation && (
              <div className="d-flex align-items-center gap-3">
                <div className="position-relative">
                  <div className="conversation-avatar shadow-sm">
                    {buildInitials(activeConversation.first_name, activeConversation.last_name)}
                  </div>
                  {activeConversation.is_online && (
                    <span className="position-absolute bottom-0 end-0 p-1 bg-success border border-white rounded-circle"></span>
                  )}
                </div>
                <div className="conversation-title-block">
                  <div className="conversation-title">
                    {activeConversation.first_name} {activeConversation.last_name}
                  </div>
                  <div className={`conversation-status ${activeConversation.is_online ? 'is-online' : ''}`}>
                    {formatPresenceText(activeConversation.is_online, activeConversation.last_seen)}
                  </div>
                </div>
              </div>
            )}
          </Offcanvas.Title>
          <Dropdown align="end">
            <Dropdown.Toggle variant="link" className="text-muted border-0 p-0 no-arrow">
              <i className="fas fa-ellipsis-v"></i>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={handleClearConversation} className="text-danger">
                <i className="fas fa-trash-alt me-2"></i>
                Clear Conversation
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column p-0 bg-light">
          {conversationError && (
            <Alert variant="danger" className="m-3 mb-0">
              <i className="fas fa-exclamation-circle me-2"></i>
              {conversationError}
            </Alert>
          )}
          {/* Messages Area */}
          <div className="flex-grow-1 p-3 overflow-auto d-flex flex-column gap-3" style={{ scrollBehavior: 'smooth' }}>
            {conversationMessages.length === 0 ? (
              <div className="text-center my-auto text-muted">
                <div className="mb-3">
                  <i className="fas fa-comments fa-3x text-muted opacity-25"></i>
                </div>
                <p>No messages yet.</p>
                <p className="small">Start the conversation by saying hello!</p>
                {conversationStarter && (
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    className="mt-2 rounded-pill"
                    onClick={() => setMessageDraft(conversationStarter)}
                  >
                    Use AI Starter
                  </Button>
                )}
              </div>
            ) : (
              conversationMessages.map((msg, idx) => {
                const senderId = typeof msg.sender === 'object' ? msg.sender?.id : msg.sender;
                const isSelf = senderId === student._id;
                return (
                  <div key={idx} className={`d-flex ${isSelf ? 'justify-content-end' : 'justify-content-start'}`}>
                    <div className={`p-3 rounded-4 shadow-sm chat-bubble ${isSelf ? 'sent' : 'received'}`} style={{ maxWidth: '85%' }}>
                      <div className="small mb-1 opacity-75 fw-bold">
                        {isSelf ? 'You' : activeConversation.first_name}
                      </div>
                      <div>{msg.body || msg.message || msg.content}</div>
                      <div className="d-flex justify-content-end mt-1">
                        <small className="opacity-50" style={{ fontSize: '0.7rem' }}>
                          {formatConversationTimestamp(msg.timestamp)}
                        </small>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={conversationEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-top">
            <Form onSubmit={handleSendConversationMessage}>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  placeholder="Type a message..."
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  className="rounded-pill bg-light border-0 px-4 py-2"
                  autoFocus
                />
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: 46, height: 46 }}
                  disabled={!messageDraft.trim()}
                >
                  <i className="fas fa-paper-plane"></i>
                </Button>
              </div>
            </Form>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <style jsx>{`
        .d-lg-flex {
          display: flex !important;
        }
        @media (min-width: 992px) {
          .ms-lg-auto {
            margin-left: 280px !important;
          }
        }
        .fade-in-up {
          animation: fadeInUp 0.5s ease-out;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: 20px;
        }
        .hover-danger:hover {
          background-color: #dc3545 !important;
          color: white !important;
        }
      `}</style>
    </>
  );
}

export async function getServerSideProps(context) {
  const [{ default: connectDb }, authModule, utilsModule, adminModule] = await Promise.all([
    import('../lib/db.js'),
    import('../lib/studentPortalAuth.js'),
    import('../lib/studentPortalUtils.js'),
    import('../lib/portalAdmin.js')
  ]);

  await connectDb();
  const session = await authModule.getPortalSessionFromRequest(context.req, context.res);
  const resolvedPath = context.resolvedUrl || context.req?.url || '';
  const isLoginRoute = resolvedPath.startsWith('/login');

  const logSSR = (msg) => {
    const timestamp = new Date().toISOString();
    console.log(`[SSR DEBUG] [${timestamp}] ${msg}`);
  };

  logSSR(`getServerSideProps called for ${resolvedPath}`);

  if (!session || !session.student) {
    logSSR('No session found. Redirecting.');
    console.log('[SSR] No session found in getServerSideProps. Redirecting to login.');
    if (session) {
      console.log('[SSR] Session object exists but no student:', session);
    } else {
      console.log('[SSR] Session object is null/undefined');
    }
    
    if (isLoginRoute) {
      return {
        props: {}
      };
    }
    return {
      redirect: {
        destination: `/login?next=${encodeURIComponent(resolvedPath || '/student-portal')}`,
        permanent: false
      }
    };
  }

  logSSR(`Session found for student: ${session.student._id}`);
  const payload = utilsModule.buildPortalStudentPayload(session.student);
  const allowAdmin = adminModule.canAccessAdminTools(session.student);
  const meta = {
    has_custom_password: Boolean(session.student.portal_password_hash),
    used_default_password: false,
    can_access_admin: allowAdmin,
    admin_shortcuts: allowAdmin ? adminModule.ADMIN_SHORTCUTS : []
  };

  console.log('[SSR] Returning props:', { initialStudent: payload ? 'FOUND' : 'NULL', meta });
  logSSR(`Returning props with initialStudent: ${payload ? 'FOUND' : 'NULL'}`);
  return {
    props: { initialStudent: payload, initialPortalMeta: meta }
  };
}

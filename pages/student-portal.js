import React, { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
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
  Dropdown,
  Modal
} from 'react-bootstrap';
import { io } from 'socket.io-client';
import { STUDENT_PORTAL_FIELD_DEFS, STUDENT_PORTAL_FIELD_NAMES } from '../config/studentPortalFields.js';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { useFeed } from '../hooks/useFeed';
import StudySyncView from '../components/StudySyncView';
import GroupsView from '../components/GroupsView';
import DigitalLibrary from '../components/DigitalLibrary';
import Feed from '../components/community/Feed';
import CustomToastContainer from '../components/ui/ToastContainer';
import PortalSidebar from '../components/portal/PortalSidebar';

const DEFAULT_PASSWORD = 'dasnadas'; // Force rebuild

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

const MANDAL_OPTIONS = [
  'Windsor', 'Brampton', 'Mississauga', 'Etobicoke', 'Kitchener', 'London', 'Hamilton', 'Other'
];

const MUKT_OPTIONS = ['Yuvak', 'Yuvati', 'Ambrish'];

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

const renderAvatar = (profile) => {
  if (profile?.profile_picture) {
    return (
      <img
        src={profile.profile_picture}
        alt={`${profile.first_name} ${profile.last_name}`}
        className="w-100 h-100 rounded-circle object-fit-cover"
      />
    );
  }
  return buildInitials(profile?.first_name, profile?.last_name);
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
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerMandal, setRegisterMandal] = useState('');
  const [registerMuktType, setRegisterMuktType] = useState('');
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
  
  // Restore session password from local storage on mount
  useEffect(() => {
    const savedPassword = localStorage.getItem('portalSessionPassword');
    if (savedPassword) {
      setSessionPassword(savedPassword);
    } else {
        // Dev fallback
        setSessionPassword('dasnadas');
    }
  }, []);

  useEffect(() => {
      if (sessionPassword) {
          localStorage.setItem('portalSessionPassword', sessionPassword);
      }
  }, [sessionPassword]);
  const [portalMeta, setPortalMeta] = useState(initialPortalMeta || {
    has_custom_password: false,
    used_default_password: false,
    can_access_admin: false,
    admin_shortcuts: []
  });
  const [activePane, setActivePane] = useState('feed');
  const [communityProfiles, setCommunityProfiles] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [conversationStarter, setConversationStarter] = useState('');

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

  const removeToast = (id) => {
    setToastQueue((prev) => prev.filter((t) => t.id !== id));
  };

  // Help Board State
  const [helpRequests, setHelpRequests] = useState([]);
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpError, setHelpError] = useState('');
  const [helpSuccess, setHelpSuccess] = useState('');
  const [helpScope, setHelpScope] = useState('open');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLocation, setFilterLocation] = useState('Windsor');
  const [helpForm, setHelpForm] = useState({
    title: '',
    description: '',
    tags: '',
    category: '',
    urgency: 'Medium',
    location: 'Windsor',
    is_anonymous: false
  });
  const [helpSubmitLoading, setHelpSubmitLoading] = useState(false);
  const [responseDrafts, setResponseDrafts] = useState({});
  const [respondingRequestId, setRespondingRequestId] = useState('');

  // Password State
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [followModalType, setFollowModalType] = useState('followers');
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followList, setFollowList] = useState([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingRead, setClearingRead] = useState(false);

  // Advanced Theme System - Start with a default to avoid hydration mismatch
  const [theme, setTheme] = useState('cyberpunk');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Activity History Toggle
  const [showActivityHistory, setShowActivityHistory] = useState(false);

  // Follow Requests State
  const [followRequests, setFollowRequests] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const conversationEndRef = useRef(null);
  const socketRef = useRef(null);
  const activeConversationRef = useRef(null);
  const inboxThreadsRef = useRef([]);

  const portalAuthHeadersRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [toastQueue, setToastQueue] = useState([]);
  const [profilePreview, setProfilePreview] = useState(null);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Likes Modal State
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likesModalTitle, setLikesModalTitle] = useState('Likes');
  const [likesModalUsers, setLikesModalUsers] = useState([]);

  // Comment Delete Confirmation Modal
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [postOfCommentToDelete, setPostOfCommentToDelete] = useState(null);

  // Post Delete Confirmation Modal
  const [showDeletePostModal, setShowDeletePostModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);



  // Feed state
  const [feedScope, setFeedScope] = useState('all');
  const [communityScope, setCommunityScope] = useState('all'); // Added community scope
  const { posts: feedPosts, isLoading: feedLoading, error: feedError, mutate: mutateFeed } = useFeed(feedScope);
  const [postForm, setPostForm] = useState({ content: '' });
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postComments, setPostComments] = useState({}); // { postId: [comments] }
  const [commentDrafts, setCommentDrafts] = useState({}); // { postId: text }
  const [showComments, setShowComments] = useState({}); // { postId: boolean }



  const handleUpdatePost = async (postId, newContent) => {
    // Optimistic Update
    mutateFeed((current) => ({
      ...current,
      posts: (current?.posts || []).map(p => 
        (p.id === postId || p._id === postId) ? { ...p, content: newContent } : p
      )
    }), false);

    try {
      await fetch('/api/student-portal/posts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(portalAuthHeadersRef.current || {})
        },
        body: JSON.stringify({ postId, content: newContent })
      });

      enqueueToast({
        variant: 'success',
        title: 'Post Updated',
        message: 'Your post has been updated.'
      });
      
      mutateFeed(); // Revalidate
    } catch (error) {
      console.error('Update error:', error);
      mutateFeed(); // Revert
      enqueueToast({
        variant: 'danger',
        title: 'Error',
        message: 'Could not update post.'
      });
    }
  };


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

  // Refs for stable callback access
  const helpScopeRef = useRef(helpScope);
  const filterCategoryRef = useRef(filterCategory);
  const filterLocationRef = useRef(filterLocation);
  const portalAuthHeadersSyncRef = useRef(portalAuthHeadersRef.current);

  // Sync refs with state
  useEffect(() => {
    helpScopeRef.current = helpScope;
    filterCategoryRef.current = filterCategory;
    filterLocationRef.current = filterLocation;
    portalAuthHeadersSyncRef.current = portalAuthHeadersRef.current;
  }, [helpScope, filterCategory, filterLocation]);

  const refreshHelpRequests = useCallback(
    async (scopeValue, catValue, locValue) => {
      // Use explicit arguments if provided, otherwise fallback to Refs (current state)
      // This makes the function robust against argument-less calls while keeping it stable

      const headers = portalAuthHeadersSyncRef.current || portalAuthHeadersRef.current;
      if (!headers) {
        setHelpLoading(false);
        return;
      }

      setHelpLoading(true);
      setHelpError('');

      try {
        const params = new URLSearchParams();

        // Resolve values: Argument > Ref (State) > Default
        const currentScope = scopeValue !== undefined ? scopeValue : (helpScopeRef.current || 'open');
        params.set('scope', currentScope);

        if (currentScope === 'open') {
          const cat = catValue !== undefined ? catValue : filterCategoryRef.current;
          const loc = locValue !== undefined ? locValue : filterLocationRef.current;

          if (cat) params.set('category', cat);
          if (loc) params.set('location', loc);
        }

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
    [] // Stable identity - no dependencies
  );

  // Trigger refresh when filters change
  useEffect(() => {
    if (student?._id) {
      refreshHelpRequests(helpScope, filterCategory, filterLocation);
    }
  }, [filterCategory, filterLocation, helpScope, student?._id, refreshHelpRequests]);
  // Notification helpers
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/student-portal/notifications', {
        headers: portalAuthHeadersRef.current || {}
      });
      if (res.ok) {
        const data = await res.json();
        // Map database notifications to frontend format
        const mappedNotifications = data.notifications.map(notif => ({
          id: notif._id,
          _id: notif._id,
          title: notif.title,
          message: notif.message,
          read: notif.read,
          timestamp: notif.created_at,
          type: notif.type,
          actionType: notif.type, // For follow_request actions
          userId: notif.data?.userId,
          userName: notif.data?.userName,
          sender: notif.sender
        }));
        setNotifications(mappedNotifications);
        setUnreadNotificationCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  const addNotification = useCallback((notification) => {
    // For real-time notifications, we just add them to the list
    // The backend should have already saved them
    const newNotif = {
      id: notification._id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      read: false,
      timestamp: new Date().toISOString(),
      ...notification
    };

    setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
    setUnreadNotificationCount((prev) => prev + 1);

    enqueueToast({
      variant: notification.variant || 'info',
      title: notification.title,
      message: notification.message
    });
  }, [enqueueToast]);

  const markNotificationAsRead = async (notifId) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n._id === notifId || n.id === notifId ? { ...n, read: true } : n))
    );
    setUnreadNotificationCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch('/api/student-portal/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(portalAuthHeadersRef.current || {})
        },
        body: JSON.stringify({ notificationId: notifId })
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (markingAll || unreadNotificationCount === 0) return;

    setMarkingAll(true);

    // Optimistic update
    const previousUnreadCount = unreadNotificationCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotificationCount(0);

    try {
      const resp = await fetch('/api/student-portal/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(portalAuthHeadersRef.current || {})
        },
        body: JSON.stringify({ markAll: true })
      });

      if (!resp.ok) throw new Error('Failed to update');

      enqueueToast({
        variant: 'success',
        title: 'Notifications Updated',
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Revert if failed
      setUnreadNotificationCount(previousUnreadCount);
      fetchNotifications(); // Refetch to be safe

      enqueueToast({
        variant: 'danger',
        title: 'Update Failed',
        message: 'Could not mark notifications as read'
      });
    } finally {
      setMarkingAll(false);
    }

  };

  const clearReadNotifications = async () => {
    if (clearingRead) return;

    // Check if there are any read notifications to clear
    const hasRead = notifications.some(n => n.read);
    if (!hasRead) return;

    setClearingRead(true);

    // Optimistic: Remove read notifications
    const previousNotifications = [...notifications];
    setNotifications(prev => prev.filter(n => !n.read));

    try {
      const resp = await fetch('/api/student-portal/notifications?clearAllRead=true', {
        method: 'DELETE',
        headers: {
          ...(portalAuthHeadersRef.current || {})
        }
      });

      if (!resp.ok) throw new Error('Failed to clear');

      enqueueToast({
        variant: 'success',
        title: 'Notifications Cleared',
        message: 'Read notifications have been removed'
      });
    } catch (error) {
      console.error('Failed to clear read notifications:', error);
      // Revert
      setNotifications(previousNotifications);
      enqueueToast({
        variant: 'danger',
        title: 'Action Failed',
        message: 'Could not clear notifications'
      });
    } finally {
      setClearingRead(false);
    }
  };

  // Fetch notifications on mount
  useEffect(() => {
    if (student?._id) {
      fetchNotifications();
    }
  }, [student?._id, fetchNotifications]);

  // Socket.IO Connection
  useEffect(() => {
    const socket = io();

    socket.on('connect', () => {
      console.log('Socket connected');
      // If student data is already available, join immediately
      if (student?._id || student?.id) {
        const studentId = student._id || student.id;
        console.log('Joining student room:', studentId);
        socket.emit('student:join', { studentId });
      }
    });

    // Also emit join if student data becomes available after connection
    if (socket.connected && (student?._id || student?.id)) {
      const studentId = student._id || student.id;
      console.log('Joining student room (delayed):', studentId);
      socket.emit('student:join', { studentId });
    }

    socket.on('notification', (data) => {
      console.log('Received notification:', data);
      addNotification(data);
    });

    socket.on('follow_update', (data) => {
      if (data.targetId === student?.id || data.followerId === student?.id) {
        // Refresh student data to get latest counts
        fetch('/api/student-portal/profile', {
          headers: portalAuthHeadersRef.current || {}
        })
          .then(res => res.json())
          .then(data => {
            if (data.student) setStudent(data.student);
          })
          .catch(err => console.error('Failed to refresh student data on follow update', err));
      }
    });

    socket.on('follow_request', (data) => {
      // Add notification for follow request
      addNotification({
        title: 'Follow Request',
        message: data.message,
        variant: 'info',
        actionType: 'follow_request',
        userId: data.userId,
        userName: data.userName
      });

      // Update follow requests list
      setFollowRequests(prev => [...prev, data.userId]);
    });

    socket.on('follow_accepted', (data) => {
      // Notification that your follow request was accepted
      addNotification({
        title: 'Request Accepted',
        message: data.message,
        variant: 'success'
      });

      // Refresh student data
      fetch('/api/student-portal/profile', {
        headers: portalAuthHeadersRef.current || {}
      })
        .then(res => res.json())
        .then(data => {
          if (data.student) setStudent(data.student);
        })
        .catch(err => console.error('Failed to refresh after accept', err));
    });

    socket.on('typing', (data) => {
      if (activeConversationRef.current?.id === data.senderId) {
        setIsTyping(true);
      }
    });

    socket.on('stop_typing', (data) => {
      if (activeConversationRef.current?.id === data.senderId) {
        setIsTyping(false);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [student?._id, student?.id, addNotification]);

  // Load theme from localStorage on client-side only
  useEffect(() => {
    const saved = localStorage.getItem('portalTheme');
    if (saved && saved !== theme) {
      setTheme(saved);
    }
    setThemeLoaded(true);
  }, []);

  // Apply Advanced Theme to entire app
  useEffect(() => {
    const themes = {
      cyberpunk: {
        bg: '#09090b',
        surface: '#18181b',
        primary: '#d946ef',
        secondary: '#8b5cf6',
        accent: '#22c55e',
        text: '#fafafa',
        textSecondary: '#a1a1aa',
        slot: '#3f3f46', // Zinc 700
        border: '#3f3f46' // Zinc 700
      },
      ocean: {
        bg: '#0f172a',
        surface: '#1e293b',
        primary: '#38bdf8',
        secondary: '#818cf8',
        accent: '#2dd4bf',
        text: '#f8fafc',
        textSecondary: '#94a3b8',
        slot: '#334155', // Slate 700
        border: '#334155' // Slate 700
      },
      sunset: {
        bg: '#2a1b2d',
        surface: '#452c48',
        primary: '#fb923c',
        secondary: '#f472b6',
        accent: '#facc15',
        text: '#fff1f2',
        textSecondary: '#fda4af',
        slot: '#581c87', // Violet 900
        border: '#581c87' // Violet 900
      },
      forest: {
        bg: '#052e16',
        surface: '#064e3b',
        primary: '#4ade80',
        secondary: '#a3e635',
        accent: '#22d3ee',
        text: '#ffffff',
        textSecondary: '#bbf7d0',
        slot: '#14532d', // Green 900
        border: '#14532d' // Green 900
      },
      aurora: {
        bg: '#020617',
        surface: '#0f172a',
        primary: '#a855f7',
        secondary: '#ec4899',
        accent: '#14b8a6',
        text: '#f8fafc',
        textSecondary: '#cbd5e1',
        slot: '#374151', // Gray 700
        border: '#374151' // Gray 700
      },
      light: {
        bg: '#f8fafc',
        surface: '#ffffff',
        primary: '#2563eb',
        secondary: '#4f46e5',
        accent: '#059669',
        text: '#0f172a',
        textSecondary: '#64748b',
        slot: '#cbd5e1', // Slate 300
        border: '#e2e8f0' // Slate 200
      },
      dark: {
        bg: '#000000',
        surface: '#121212',
        primary: '#3b82f6',
        secondary: '#a855f7',
        accent: '#10b981',
        text: '#ffffff',
        textSecondary: '#a3a3a3',
        slot: '#404040', // Neutral 700
        border: '#404040' // Neutral 700
      }
    };

    const selectedTheme = themes[theme] || themes.cyberpunk;
    Object.entries(selectedTheme).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--color-${key}`, value);
    });

    // Update Bootstrap Variables
    document.documentElement.style.setProperty('--bs-primary', selectedTheme.primary);
    document.documentElement.style.setProperty('--bs-body-bg', selectedTheme.bg);
    document.documentElement.style.setProperty('--bs-body-color', selectedTheme.text);
    document.documentElement.style.setProperty('--bs-link-color', selectedTheme.primary);
    document.documentElement.style.setProperty('--bs-link-hover-color', selectedTheme.secondary);

    // Sync with global variables for compatibility
    document.documentElement.style.setProperty('--text-main', selectedTheme.text);
    document.documentElement.style.setProperty('--text-secondary', selectedTheme.textSecondary);
    document.documentElement.style.setProperty('--text-muted', selectedTheme.textSecondary);
    document.documentElement.style.setProperty('--bs-secondary', selectedTheme.textSecondary);
    document.documentElement.style.setProperty('--bs-secondary-color', selectedTheme.textSecondary);

    // Sync background variables
    document.documentElement.style.setProperty('--bg-body', selectedTheme.bg);
    document.documentElement.style.setProperty('--bg-surface', selectedTheme.surface);
    document.documentElement.style.setProperty('--bg-slot', selectedTheme.slot || '#3f3f46');

    // Sync border variables
    document.documentElement.style.setProperty('--border-color', selectedTheme.border || '#e5e7eb');
    document.documentElement.style.setProperty('--bs-border-color', selectedTheme.border || '#e5e7eb');

    // Also set body background
    document.body.style.background = selectedTheme.bg;
    document.body.style.color = selectedTheme.text;

    // Save to localStorage
    localStorage.setItem('portalTheme', theme);
  }, [theme]);

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
      { key: 'feed', label: 'Community Feed', icon: 'fas fa-rss' },
      { key: 'study-sync', label: 'Study Sync', icon: 'fas fa-fire' },
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
        // Add Scope
        params.set('scope', communityScope);

        console.log('[DEBUG] refreshCommunityProfiles fetching with scope:', communityScope, 'Search:', searchValue);

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
    [communitySearch, communityScope, portalAuthHeaders]
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
      const targetId = base.id || base._id;
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
        mutateFeed((current) => {
          if (!current?.posts) return current;
          
          return {
            ...current,
            posts: current.posts.map((post) => {
              if (post.id === data.postId || post._id === data.postId) {
                let newLikedBy = post.liked_by || [];
                
                if (data.liked) {
                  // Add user if not present
                  if (!newLikedBy.some(u => u.id === data.userId)) {
                    newLikedBy = [...newLikedBy, { id: data.userId, name: data.userName }];
                  }
                } else {
                  // Remove user
                  newLikedBy = newLikedBy.filter(u => u.id !== data.userId);
                }

                return { 
                  ...post, 
                  likes: data.likes,
                  liked_by: newLikedBy,
                  // Also update is_liked if it's the current user
                  is_liked: data.userId === (student._id || student.id) ? data.liked : post.is_liked
                };
              }
              return post;
            })
          };
        }, false);
      }
    });
      socket.on('post:comment', (data) => {
       if (data?.comment) {
         // Prevent double-commenting for the author (handled by optimistic update)
         const viewerId = student?._id || student?.id;
         const authorId = data.comment.author?.id || data.comment.author?._id;
         
         if (viewerId && authorId && String(viewerId) === String(authorId)) {
             return; 
         }

         const postId = data.comment.post;
         setPostComments((prev) => {
           const currentComments = prev[postId] || [];
           // Deduplicate by ID just in case
           if (currentComments.some(c => c._id === data.comment._id || c.id === data.comment._id)) {
             return prev;
           }
           return {
             ...prev,
             [postId]: [...currentComments, data.comment]
           };
         });
         
         mutateFeed((current) => ({
           ...current,
           posts: (current?.posts || []).map((post) =>
             post.id === postId ? { ...post, comments: (post.comments || 0) + 1 } : post
           )
         }), false);
       }
     });

    socket.on('follow_update', (data) => {
      console.log('[CHAT] Follow update received:', data);
      setStudent(prev => {
        if (!prev) return prev;
        
        let newStudent = { ...prev };

        // 1. Someone followed me
        if (data.action === 'follow' && String(data.targetId) === String(prev._id)) {
           if (!newStudent.followers) newStudent.followers = [];
           if (!newStudent.followers.includes(data.followerId)) {
             newStudent.followers = [...newStudent.followers, data.followerId];
           }
           
           // Update Modal List if open
           if (showFollowModal && followModalType === 'followers') {
              setFollowList(currentList => {
                 if (currentList.some(u => u.id === data.followerId || u._id === data.followerId)) return currentList;
                 // We need the user object. Since we only have ID and Name, we can construct a basic one or fetch.
                 // Constructing basic one for immediate feedback
                 return [{
                   id: data.followerId, 
                   first_name: data.followerName || 'New Follower', 
                   last_name: '',
                   profile_picture: data.followerPic || '' // If available
                 }, ...currentList];
              });
           }
        }
        
        // 2. Someone unfollowed me
        if (data.type === 'lost_follower' && data.userId) {
           if (newStudent.followers) {
             newStudent.followers = newStudent.followers.filter(id => id !== data.userId);
           }
           
           // Update Modal List if open
           if (showFollowModal && followModalType === 'followers') {
              setFollowList(currentList => currentList.filter(u => u.id !== data.userId && u._id !== data.userId));
           }
        }

        // 3. I unfollowed someone (sync)
        if (data.type === 'unfollow' && data.targetId) {
             if (newStudent.following) {
               newStudent.following = newStudent.following.filter(id => id !== data.targetId);
             }
             
             // Update Modal List if open
             if (showFollowModal && followModalType === 'following') {
                setFollowList(currentList => currentList.filter(u => u.id !== data.targetId && u._id !== data.targetId));
             }
        }
        
        return newStudent;
      });
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
      socket.off('follow_update');
      socket.disconnect();
      socketRef.current = null;
      console.log('[CHAT] Socket disconnected on cleanup');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?._id, handleIncomingMessage, handleConversationEvent, handleRealtimeHelpUpdate, refreshInboxThreads, showFollowModal, followModalType]);


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
    if (student && (activePane === 'community' || activePane === 'feed')) {
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

  // Refetch when scope changes
  useEffect(() => {
    if (activePane === 'community') {
        refreshCommunityProfiles();
    }
  }, [communityScope, refreshCommunityProfiles]);



  useEffect(() => {
    if (showConversationPanel && conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationMessages, showConversationPanel]);

  // Handle Invite Link
  useEffect(() => {
    const handleInvite = async () => {
      if (!student) return;

      const urlParams = new URLSearchParams(window.location.search);
      const inviteCode = urlParams.get('invite');

      if (inviteCode) {
        try {
          const res = await fetch('/api/student-portal/groups/join-via-link', {
            method: 'POST',
            headers: { ...portalAuthHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inviteCode })
          });
          const data = await res.json();

          if (data.success) {
            enqueueToast({
              variant: 'success',
              title: 'Joined Group',
              message: data.message
            });
            // Clear URL param
            window.history.replaceState({}, document.title, window.location.pathname);
            // Switch to groups tab
            setActivePane('groups');
          } else {
            enqueueToast({
              variant: 'danger',
              title: 'Join Failed',
              message: data.message
            });
          }
        } catch (error) {
          console.error('Error joining via invite:', error);
        }
      }
    };

    handleInvite();
  }, [student, portalAuthHeaders]);

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
          tags: helpForm.tags,
          category: helpForm.category,
          urgency: helpForm.urgency,
          location: helpForm.location,
          is_anonymous: helpForm.is_anonymous
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to create help request right now.');
      }

      setHelpForm({ title: '', description: '', tags: '' });

      // Fix: Always rely on refreshHelpRequests to avoid duplicates
      await refreshHelpRequests(helpScope, filterCategory, filterLocation);

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
    await refreshHelpRequests(scopeValue, filterCategory, filterLocation);
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
        const pId = post._id || post.id;
        if (pId === postId) {
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

  const [commentSubmitting, setCommentSubmitting] = useState({});

  const handleCommentSubmit = async (postId) => {
    if (commentSubmitting[postId]) return;
    
    const content = commentDrafts[postId]?.trim();
    if (!content) {
      return;
    }

    setCommentSubmitting(prev => ({ ...prev, [postId]: true }));

    // Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const optimisticComment = {
      id: tempId,
      _id: tempId,
      post: postId,
      author: {
        first_name: student.first_name,
        last_name: student.last_name,
        profile_picture: student.profile_picture
      },
      author_name: `${student.first_name} ${student.last_name || ''}`.trim(),
      content: content,
      created_at: new Date().toISOString()
    };

    setPostComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), optimisticComment]
    }));
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));

    try {
      const response = await fetch('/api/student-portal/post-actions?action=comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(portalAuthHeadersRef.current || {})
        },
        body: JSON.stringify({ postId, content })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to add comment');
      }
      
      // Replace optimistic comment with real one
      setPostComments((prev) => ({
        ...prev,
        [postId]: prev[postId].map(c => c.id === tempId ? data.comment : c)
      }));

      // Update comment count
      mutateFeed();
    } catch (error) {
      console.error('Comment submission failed:', error);
      // Revert optimistic comment
      setPostComments((prev) => ({
        ...prev,
        [postId]: prev[postId].filter(c => c.id !== tempId)
      }));
      setCommentDrafts((prev) => ({ ...prev, [postId]: content })); // Restore text
      enqueueToast({
        variant: 'danger',
        title: 'Error',
        message: 'Failed to post comment'
      });
    } finally {
      setCommentSubmitting(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeleteComment = (commentId, postId) => {
      setCommentToDelete(commentId);
      setPostOfCommentToDelete(postId);
      setShowDeleteCommentModal(true);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete || !postOfCommentToDelete) return;

    const commentId = commentToDelete;
    const postId = postOfCommentToDelete;
    
    // Optimistic Update
    setPostComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => (c.id || c._id) !== commentId)
    }));
    
    // Update count in feed
    mutateFeed((current) => ({
        ...current,
        posts: (current?.posts || []).map(p => 
            (p.id === postId || p._id === postId) ? { ...p, comments: Math.max(0, (p.comments || 0) - 1) } : p
        )
    }), false);

    setShowDeleteCommentModal(false);
    setCommentToDelete(null);
    setPostOfCommentToDelete(null);

    try {
        await fetch(`/api/student-portal/post-actions?action=comment&commentId=${commentId}`, {
            method: 'DELETE',
            headers: {
                ...(portalAuthHeadersRef.current || {})
            }
        });
        mutateFeed(); // Revalidate
    } catch (error) {
        console.error('Delete comment failed:', error);
        enqueueToast({ variant: 'danger', title: 'Error', message: 'Failed to delete comment' });
        mutateFeed(); // Revert
    }
  };

  const handleUpdateComment = async (commentId, content, postId) => {
    // Optimistic Update
    setPostComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c => 
            (c.id === commentId || c._id === commentId) ? { ...c, content } : c
        )
    }));

    try {
        await fetch('/api/student-portal/post-actions?action=comment', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(portalAuthHeadersRef.current || {})
            },
            body: JSON.stringify({ commentId, content })
        });
        mutateFeed(); 
    } catch (error) {
        console.error('Update comment failed:', error);
        enqueueToast({ variant: 'danger', title: 'Error', message: 'Failed to update comment' });
        mutateFeed(); // Revert
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

  const handleDeletePost = (postId) => {
    setPostToDelete(postId);
    setShowDeletePostModal(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    const postId = postToDelete;

    // Optimistic Update: Immediately remove post from UI
    mutateFeed((current) => ({
      ...current,
      posts: (current?.posts || []).filter(p => p.id !== postId && p._id !== postId)
    }), false);

    setShowDeletePostModal(false);
    setPostToDelete(null);

    try {
      const headers = portalAuthHeadersRef.current || {};
      const response = await fetch(`/api/student-portal/posts?postId=${postId}`, {
        method: 'DELETE',
        headers: {
          ...headers
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Unable to delete post');
      }
      
      enqueueToast({
        variant: 'success',
        title: 'Post Deleted',
        message: 'Post has been removed successfully.'
      });

      mutateFeed(); // Revalidate to be sure
    } catch (error) {
      console.error('Delete post failed:', error);
      mutateFeed(); // Revert on error
      enqueueToast({
        variant: 'danger',
        title: 'Delete Failed',
        message: error.message || 'Could not delete the post.'
      });
    }
  };

  const handleShowLikes = (post) => {
    if (!post) return;
    setLikesModalTitle('People who liked this');
    setLikesModalUsers(post.liked_by || []);
    setShowLikesModal(true);
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
          confirmPassword: registerConfirm,
          first_name: registerFirstName,
          last_name: registerLastName,
          mandal_name: registerMandal,
          mukt_type: registerMuktType
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

  const handleShowFollowModal = async (type) => {
    setFollowModalType(type);
    setShowFollowModal(true);
    setFollowListLoading(true);

    try {
      const response = await fetch(
        `/api/student-portal/followers?type=${type}&userId=${student._id}`,
        { headers: portalAuthHeaders || {} }
      );

      if (response.ok) {
        const data = await response.json();
        const list = data[type] || [];
        setFollowList(list);

        // Sync local student state to match the server's real count
        // This fixes the mismatch between the profile card count (e.g. 4) and the actual list (e.g. 2)
        const realIds = list.map(u => u.id || u._id).filter(Boolean);
        
        setStudent(prev => {
           if (!prev) return prev;
           return {
             ...prev,
             [type]: realIds // unique list of IDs
           };
        });

      } else {
        console.error('Failed to fetch', type);
        setFollowList([]);
      }
    } catch (error) {
      console.error('Error fetching followers/following:', error);
      setFollowList([]);
    } finally {
      setFollowListLoading(false);
    }
  };

  const handleFollow = async (targetId, action) => {
    // 1. Optimistic UI Update (Instant Feedback)
    const previousStudent = { ...student }; // Backup for rollback

    if (action === 'follow') {
      setStudent(prev => ({
        ...prev,
        following: [...(prev.following || []), targetId]
      }));
      // Update community profiles instantly if visible
      if (activePane === 'community') {
        setCommunityProfiles(prev => prev.map(p => {
          if (p.id === targetId || p._id === targetId) {
            const currentFollowers = p.followers || [];
            // Avoid duplicates
            if (currentFollowers.includes(student._id)) return p;
            return { ...p, followers: [...currentFollowers, student._id] };
          }
          return p;
        }));
      }
    } else if (action === 'request') {
      // Optimistic UI for Request
      if (activePane === 'community') {
        setCommunityProfiles(prev => prev.map(p => {
          if (p.id === targetId || p._id === targetId) {
            return { ...p, has_requested_follow: true };
          }
          return p;
        }));
      }
    } else if (action === 'unfollow') {
      setStudent(prev => ({
        ...prev,
        following: (prev.following || []).filter(id => id !== targetId)
      }));
      // Update community profiles instantly if visible
      if (activePane === 'community') {
        setCommunityProfiles(prev => prev.map(p => {
          if (p.id === targetId || p._id === targetId) {
            return {
              ...p,
              followers: (p.followers || []).filter(id => id !== student._id),
              has_requested_follow: false
            };
          }
          return p;
        }));
      }
    }

    try {
      // 2. Perform API Call in Background
      const response = await fetch('/api/student-portal/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(portalAuthHeaders || {})
        },
        body: JSON.stringify({ targetId, action })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Follow API Error:', response.status, errorText);
        throw new Error(errorText || 'Failed to update follow status');
      }

      const data = await response.json();

      // 3. Handle specific server responses if needed (e.g., request vs follow)
      if (action === 'request') {
        enqueueToast({
          variant: 'success',
          title: 'Request Sent!',
          message: 'Your follow request has been sent'
        });
      } else if (action === 'accept') {
        // ... existing accept logic ...
      }

    } catch (error) {
      console.error('Follow action failed:', error);
      // 4. Rollback on Error
      setStudent(previousStudent);
      if (activePane === 'community') {
        refreshCommunityProfiles(communitySearch); // Re-fetch to be safe
      }
      enqueueToast({
        variant: 'danger',
        title: 'Error',
        message: 'Failed to update follow status. Please try again.'
      });
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
              
              <div className="d-flex gap-2 mb-3">
                <Button
                  variant={communityScope === 'all' ? 'primary' : 'outline-primary'}
                  size="sm"
                  className="flex-grow-1"
                  onClick={() => setCommunityScope('all')}
                >
                  All
                </Button>
                <Button
                  variant={communityScope === 'my_mandal' ? 'primary' : 'outline-primary'}
                  size="sm"
                  className="flex-grow-1"
                  onClick={() => setCommunityScope('my_mandal')}
                >
                  My Mandal
                </Button>
                <Button
                  variant={communityScope === 'other_mandals' ? 'primary' : 'outline-primary'}
                  size="sm"
                  className="flex-grow-1"
                  onClick={() => setCommunityScope('other_mandals')}
                >
                  Other
                </Button>
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
                              {renderAvatar(profile)}
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
                              <div className="d-flex gap-1 mt-1 flex-wrap">
                                  <Badge bg="info" className="fw-normal" style={{ fontSize: '0.7em' }}>
                                    {profile.mandal_name || 'Windsor'}
                                  </Badge>
                                  <Badge bg="warning" text="dark" className="fw-normal" style={{ fontSize: '0.7em' }}>
                                    {profile.mukt_type || 'Yuvak'}
                                  </Badge>
                              </div>
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
                            variant={
                              student.following?.includes(profile.id)
                                ? "outline-secondary"
                                : profile.has_requested_follow
                                  ? "secondary"
                                  : "primary"
                            }
                            disabled={profile.has_requested_follow}
                            onClick={() => {
                              const isFollowing = student.following?.includes(profile.id);
                              handleFollow(profile.id, isFollowing ? 'unfollow' : 'request');
                            }}
                          >
                            <i className={`fas fa-${student.following?.includes(profile.id)
                              ? 'user-check'
                              : profile.has_requested_follow
                                ? 'clock'
                                : 'user-plus'
                              } me-2`}></i>
                            {student.following?.includes(profile.id)
                              ? 'Following'
                              : profile.has_requested_follow
                                ? 'Requested'
                                : 'Follow'}
                          </Button>
                        )}
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

  const renderFeedPane = () => {
    // Ensure we have profiles for suggestions (fallback if empty)
    const suggestedUsers = communityProfiles.length > 0 ? communityProfiles : [];

    return (
      <div className="feed-pane mobile-feed-container h-100">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
          <div>
            <h5 className="fw-semibold mb-1">Community Feed</h5>
            <p className="text-muted small mb-0">
              Share updates, thoughts, and connect with the community.
            </p>
          </div>
          
          <div className="d-flex gap-2">
               <Button 
                  variant={feedScope === 'all' ? 'primary' : 'outline-secondary'} 
                  size="sm" 
                  onClick={() => setFeedScope('all')}
                  className="rounded-pill px-3"
               >
                  All
               </Button>
               <Button 
                  variant={feedScope === 'my_mandal' ? 'primary' : 'outline-secondary'} 
                  size="sm" 
                  onClick={() => setFeedScope('my_mandal')}
                  className="rounded-pill px-3"
               >
                  My Mandal
               </Button>
               <Button 
                  variant={feedScope === 'other_mandals' ? 'primary' : 'outline-secondary'} 
                  size="sm" 
                  onClick={() => setFeedScope('other_mandals')}
                  className="rounded-pill px-3"
               >
                  Other Mandals
               </Button>
          </div>
        </div>

        {feedError && (
          <Alert variant="danger" className="mb-4">
            {feedError}
          </Alert>
        )}

        <Feed
            posts={feedPosts}
            users={suggestedUsers}
            currentUser={student}
            onLikePost={handleLikePost}
            onShowLikes={handleShowLikes}
            onFollowUser={(id, action) => handleFollow(id, action || 'follow')}
            onMessageUser={(user) => {
                setActiveConversation({ 
                    id: user._id, 
                    first_name: user.first_name, 
                    last_name: user.last_name, 
                    profile_picture: user.profile_picture 
                });
                setActivePane('inbox');
            }}
            onCreatePost={handlePostSubmit}
            onDeletePost={handleDeletePost}
            onUpdatePost={handleUpdatePost}
            postContent={postForm.content}
            onPostContentChange={(content) => setPostForm({ ...postForm, content })}
            isSubmitting={postSubmitting}
            onToggleComments={handleLoadComments}
            onSharePost={handleSharePost}
            showComments={showComments}
            postComments={postComments}
            commentDrafts={commentDrafts}
            onCommentChange={(postId, val) => setCommentDrafts(prev => ({ ...prev, [postId]: val }))}
            onCommentSubmit={handleCommentSubmit}
            onDeleteComment={handleDeleteComment}
            onUpdateComment={handleUpdateComment}
        />
      </div>
    );
  };



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

      {/* Filter Options */}
      <div className="mb-4">
        <label className="form-label fw-bold small text-muted text-uppercase mb-2">Filter Requests</label>
        <div className="d-flex gap-2 overflow-auto pb-2 no-scrollbar align-items-center">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="form-select shadow-sm rounded-pill border-0 ps-3 pe-5"
            style={{ width: 'auto', minWidth: '180px', cursor: 'pointer' }}
          >
            <option value="">🔮 All Categories</option>
            {['Housing', 'Jobs', 'Rides', 'Academic', 'Food', 'General', 'Legal', 'Events'].map(c =>
              <option key={c} value={c}>{c}</option>
            )}
          </select>
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="form-select shadow-sm rounded-pill border-0 ps-3 pe-5"
            style={{ width: 'auto', minWidth: '180px', cursor: 'pointer' }}
          >
            <option value="">📍 All Locations</option>
            {['Windsor', 'Brampton', 'Toronto', 'Waterloo', 'London', 'Ottawa'].map(l =>
              <option key={l} value={l}>{l}</option>
            )}
          </select>
          {(filterCategory || filterLocation) && (
            <Button variant="link" className="text-muted text-decoration-none fw-semibold" onClick={() => { setFilterCategory(''); setFilterLocation(''); }}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <Card className="border-0 shadow-sm mb-4 help-form-card bg-surface">
        <Card.Body>
          <h6 className="fw-semibold mb-3">
            <i className="fas fa-plus-circle me-2 text-primary"></i>
            Create a help request
          </h6>
          <Form onSubmit={handleHelpRequestSubmit}>
            <div className="row g-3">
              <div className="col-12">
                <Form.Group controlId="help-request-title">
                  <Form.Label className="fw-semibold">I need help with...</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Briefly describe your request (e.g. Need a ride to Pearson)"
                    value={helpForm.title}
                    onChange={(event) => handleHelpFieldChange('title', event.target.value)}
                    required
                    className="form-control-lg border-0 bg-body text-main"
                  />
                </Form.Group>
              </div>

              {/* Category Selection Chips */}
              <div className="col-12">
                <label className="form-label fw-semibold d-block">Category</label>
                <div className="d-flex flex-wrap gap-2">
                  {['Housing', 'Jobs', 'Rides', 'Academic', 'Food', 'General', 'Legal', 'Events'].map(cat => (
                    <Badge
                      key={cat}
                      bg={helpForm.category === cat ? 'primary' : null}
                      className={`p-2 cursor-pointer border user-select-none ${helpForm.category === cat ? 'text-white' : 'bg-surface text-main'}`}
                      onClick={() => handleHelpFieldChange('category', cat)}
                      style={{ cursor: 'pointer' }}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Urgency & Location */}
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold">Urgency</label>
                <div className="btn-group w-100" role="group">
                  {['Low', 'Medium', 'High'].map(level => {
                    let variant = 'outline-secondary';
                    const isSelected = helpForm.urgency === level;
                    if (level === 'Low') variant = isSelected ? 'success' : 'outline-success';
                    if (level === 'Medium') variant = isSelected ? 'warning' : 'outline-warning';
                    if (level === 'High') variant = isSelected ? 'danger' : 'outline-danger';

                    return (
                      <Fragment key={level}>
                        <input
                          type="radio"
                          className="btn-check"
                          name="urgency"
                          id={`urgency-${level}`}
                          autoComplete="off"
                          checked={isSelected}
                          onChange={() => handleHelpFieldChange('urgency', level)}
                        />
                        <label className={`btn btn-${variant}`} htmlFor={`urgency-${level}`}>{level}</label>
                      </Fragment>
                    ).props.children;
                  })}
                </div>
              </div>

              <div className="col-12 col-md-6">
                <Form.Group controlId="help-request-location">
                  <Form.Label className="fw-semibold">Location</Form.Label>
                  <Form.Select
                    value={helpForm.location}
                    onChange={(e) => handleHelpFieldChange('location', e.target.value)}
                  >
                    {['Windsor', 'Brampton', 'Toronto', 'Waterloo', 'London', 'Ottawa'].map(l =>
                      <option key={l} value={l}>{l}</option>
                    )}
                  </Form.Select>
                </Form.Group>
              </div>

              <div className="col-12">
                <Form.Group controlId="help-request-description">
                  <Form.Label className="fw-semibold">Details</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Share more context..."
                    value={helpForm.description}
                    onChange={(event) => handleHelpFieldChange('description', event.target.value)}
                    className="border-0 bg-body text-main"
                  />
                </Form.Group>
              </div>

              {/* Anonymity Toggle */}
              <div className="col-12 d-flex justify-content-between align-items-center">
                <Form.Check
                  type="switch"
                  id="anonymous-switch"
                  label={
                    <span>
                      <i className="fas fa-user-secret me-2"></i>
                      Post Anonymously
                    </span>
                  }
                  checked={helpForm.is_anonymous}
                  onChange={(e) => handleHelpFieldChange('is_anonymous', e.target.checked)}
                />
              </div>

            </div>
            <div className="d-flex justify-content-end mt-4">
              <Button type="submit" variant="primary" disabled={helpSubmitLoading} className="px-4 py-2 fw-bold shadow-sm">
                {helpSubmitLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" role="status" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-project-diagram me-2"></i>
                    Smart Connect
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
                    <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                      <Badge bg={
                        request.urgency === 'High' ? 'danger' :
                          request.urgency === 'Medium' ? 'warning' : 'success'
                      } className="text-uppercase" style={{ fontSize: '0.7rem' }}>
                        {request.urgency || 'Medium'} Urgency
                      </Badge>
                      <Badge bg="dark" className="text-info border border-info">
                        {request.category || 'General'}
                      </Badge>
                      <Badge className="border bg-surface text-main">
                        <i className="fas fa-map-marker-alt me-1 text-danger"></i>
                        {request.location || 'Windsor'}
                      </Badge>
                      {request.is_owner && (
                        <Badge bg="info" text="dark">
                          Your request
                        </Badge>
                      )}
                    </div>

                    <h6 className="fw-bold fs-5 mb-2">{request.title}</h6>

                    {request.student && (
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <div style={{ width: 32, height: 32 }} className="rounded-circle overflow-hidden bg-light border">
                          {request.is_anonymous ? (
                            <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-dark text-white">
                              <i className="fas fa-user-secret"></i>
                            </div>
                          ) : request.student.profile_picture ? (
                            <img src={request.student.profile_picture} className="w-100 h-100 object-fit-cover" alt="" />
                          ) : (
                            <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-secondary text-white small fw-bold">
                              {buildInitials(request.student.first_name, request.student.last_name)}
                            </div>
                          )}
                        </div>
                        <div className="lh-1">
                          <div className="fw-semibold small">
                            {request.is_anonymous ? 'Secret Student' : `${request.student.first_name} ${request.student.last_name}`}
                            {!request.is_anonymous && request.student.reputation_points > 10 && (
                              <i className="fas fa-star text-warning ms-1" title="Top Helper"></i>
                            )}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {request.is_anonymous ? 'Anonymous' : (request.student.study || 'Student')}
                          </div>
                        </div>
                      </div>
                    )}

                    {request.description && (
                      <p className="text-muted small mb-3 bg-body p-3 rounded">{request.description}</p>
                    )}

                    {/* Smart Match Simulation */}
                    {request.match_count > 0 && request.status === 'open' && (
                      <div className="mb-2">
                        <Badge bg="success-subtle" text="success-emphasis" className="border border-success-subtle">
                          <i className="fas fa-bolt me-1"></i>
                          {request.match_count} potential helpers notified
                        </Badge>
                      </div>
                    )}

                    {request.tags?.length > 0 && (
                      <div className="d-flex flex-wrap gap-2 mb-2">
                        {request.tags.map((tag) => (
                          <span key={`${request.id}-tag-${tag}`} className="badge rounded-pill bg-surface text-muted border">
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

  const handleTyping = (e) => {
    setMessageDraft(e.target.value);

    if (!socketRef.current || !activeConversation) return;

    socketRef.current.emit('typing', { recipientId: activeConversation.id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('stop_typing', { recipientId: activeConversation.id });
    }, 1000);
  };

  const renderSecuritySettings = () => (
    <>
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

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <h5 className="fw-semibold mb-3">Theme Customization</h5>
          <p className="text-muted small mb-4">
            Choose from 7 stunning themes to personalize your portal experience
          </p>

          <Button
            variant="outline-primary"
            onClick={() => setShowThemePicker(true)}
            className="w-100"
            style={{
              padding: '1rem',
              fontSize: '1rem',
              fontWeight: '500',
              borderWidth: '2px'
            }}
          >
            <i className="fas fa-palette me-2"></i>
            Change Theme
          </Button>

          <div className="mt-3 text-center">
            <small className="text-muted">
              Current: <strong style={{ color: 'var(--color-primary)' }}>
                {theme === 'cyberpunk' ? 'Cyberpunk' :
                  theme === 'ocean' ? 'Ocean Depths' :
                    theme === 'sunset' ? 'Desert Sunset' :
                      theme === 'forest' ? 'Forest Whisper' :
                        theme === 'aurora' ? 'Northern Lights' :
                          theme === 'light' ? 'Clean Light' :
                            'Midnight Dark'}
              </strong>
            </small>
          </div>
        </Card.Body>
      </Card>
    </>
  );

  const renderAccountPane = () => (
    <div className="account-pane">
      {/* Profile Picture & Followers */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="text-center">
          <div className="position-relative d-inline-block mb-3">
            <div className="rounded-circle overflow-hidden border border-3 border-white shadow-sm" style={{ width: 100, height: 100 }}>
              {student.profile_picture ? (
                <img src={student.profile_picture} alt="Profile" className="w-100 h-100 object-fit-cover" />
              ) : (
                <div className="w-100 h-100 bg-light d-flex align-items-center justify-content-center text-primary fw-bold fs-2">
                  {buildInitials(student.first_name, student.last_name)}
                </div>
              )}
            </div>
            <label className="position-absolute bottom-0 end-0 bg-white rounded-circle shadow-sm p-2 cursor-pointer hover-scale" style={{ width: 32, height: 32, cursor: 'pointer' }}>
              <input
                type="file"
                className="d-none"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;

                  const formData = new FormData();
                  formData.append('profilePicture', file);

                  try {
                    const res = await fetch('/api/student-portal/upload-profile-picture', {
                      method: 'POST',
                      headers: portalAuthHeaders || {},
                      body: formData
                    });
                    const data = await res.json();
                    if (data.success) {
                      setStudent(prev => ({ ...prev, profile_picture: data.profile_picture }));
                      enqueueToast({ variant: 'success', title: 'Success', message: 'Profile picture updated!' });
                    }
                  } catch (err) {
                    console.error(err);
                    enqueueToast({ variant: 'danger', title: 'Error', message: 'Failed to upload picture' });
                  }
                }}
              />
              <i className="fas fa-camera text-primary small"></i>
            </label>
          </div>

          <h5 className="fw-bold mb-1">{student.first_name} {student.last_name}</h5>
          <p className="text-muted small mb-3">{student.study || 'Student'}</p>
          
          <div className="d-flex justify-content-center gap-2 mb-3">
            {student.mandal_name && (
              <Badge bg="info" className="fw-normal">
                <i className="fas fa-map-marker-alt me-1"></i>
                {student.mandal_name}
              </Badge>
            )}
            {student.mukt_type && (
              <Badge bg="warning" text="dark" className="fw-normal">
                <i className="fas fa-user-tag me-1"></i>
                {student.mukt_type}
              </Badge>
            )}
          </div>

          <div className="d-flex justify-content-center gap-4 border-top pt-3">
            <div className="text-center cursor-pointer" onClick={() => handleShowFollowModal('followers')} style={{ cursor: 'pointer' }}>
              <div className="fw-bold fs-5">{student.followers?.length || 0}</div>
              <div className="small text-muted">Followers</div>
            </div>
            <div className="text-center cursor-pointer" onClick={() => handleShowFollowModal('following')} style={{ cursor: 'pointer' }}>
              <div className="fw-bold fs-5">{student.following?.length || 0}</div>
              <div className="small text-muted">Following</div>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm mb-4">
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

      {portalMeta.can_access_admin && (
        <Card className="border-0 shadow-sm mt-4">
          <Card.Body>
            <h5 className="fw-semibold mb-3">Admin Tools</h5>
            <div className="d-flex flex-column gap-2">
              <Button
                variant="outline-primary"
                className="text-start d-flex align-items-center gap-3"
                onClick={() => setActivePane('analytics')}
              >
                <i className="fas fa-chart-line" style={{ width: 24 }}></i>
                <span>Analytics Dashboard</span>
              </Button>
              {portalMeta.admin_shortcuts.map((shortcut, idx) => (
                <Button
                  key={idx}
                  variant="outline-secondary"
                  href={shortcut.href}
                  className="text-start d-flex align-items-center gap-3"
                >
                  <i className={`${shortcut.icon} text-primary`} style={{ width: 24 }}></i>
                  <span>{shortcut.label}</span>
                </Button>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );


  // Handle notification delete
  const handleDeleteNotification = async (notificationId) => {
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadNotificationCount(prev => {
        // Only decrement if we removed an unread one
        const notif = notifications.find(n => n.id === notificationId);
        if (notif && !notif.read) return Math.max(0, prev - 1);
        return prev;
    });

    try {
      const resp = await fetch(`/api/student-portal/notifications?notificationId=${notificationId}`, {
        method: 'DELETE',
        headers: {
          ...(portalAuthHeadersRef.current || {})
        }
      });

      if (!resp.ok) throw new Error('Failed to delete');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      enqueueToast({
        variant: 'danger',
        title: 'Error',
        message: 'Could not delete notification'
      });
      // Re-fetch to restore state if needed
      // refreshNotifications(); 
    }
  };

  return (
    <>
      <Head>
        <title>Student Portal | HSAPSS Windsor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <style>{`
          :root {
            --bs-body-bg: var(--color-bg);
            --bs-body-color: var(--color-text);
            --bs-body-font-family: 'Outfit', sans-serif;
          }
          
          body {
            font-family: 'Outfit', sans-serif !important;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            font-weight: 500; /* Increased from 400 */
            font-size: 17px; /* Increased from 16px */
            letter-spacing: 0.01em;
          }
          
          /* Ensure inputs inherit font settings */
          input, select, textarea, button {
            font-family: 'Outfit', sans-serif !important;
            font-weight: 500 !important;
          }

          /* Improve Label Visibility */
          .form-label {
            font-weight: 600 !important; /* Increased from 500 */
            opacity: 1 !important; /* Full opacity */
            letter-spacing: 0.02em;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3); /* Add shadow for contrast */
            font-size: 0.95rem;
            margin-bottom: 0.5rem;
          }
          
          /* Global Theme Overrides */
          .card, .modal-content, .offcanvas, .dropdown-menu, .list-group-item, .card-modern, .sidebar-modern {
            background-color: var(--color-surface) !important;
            color: var(--color-text) !important;
            border-color: rgba(255,255,255,0.1) !important;
          }
          
          .form-control, .form-select {
            background-color: var(--color-bg) !important;
            color: var(--color-text) !important;
            border-color: var(--color-textSecondary) !important;
            font-size: 1.05rem !important; /* Larger input text */
            padding: 0.75rem 1rem !important; /* More padding */
          }
          
          .form-control::placeholder {
            color: var(--color-textSecondary) !important;
            opacity: 0.7 !important;
          }
          
          .form-control:focus, .form-select:focus {
            background-color: var(--color-bg) !important;
            color: var(--color-text) !important;
            border-color: var(--color-primary) !important;
            box-shadow: 0 0 0 0.25rem rgba(var(--color-primary-rgb), 0.25) !important;
          }

          .text-muted {
            color: var(--color-textSecondary) !important;
          }
          
          .bg-light {
            background-color: rgba(255,255,255,0.05) !important;
          }
          
          .bg-white {
            background-color: var(--color-surface) !important;
          }
          
          .border-bottom, .border-top, .border {
            border-color: rgba(255,255,255,0.1) !important;
          }

          /* Fix Sidebar Contrast */
          .nav-btn {
            color: var(--color-text) !important;
            opacity: 0.8;
            transition: all 0.2s ease;
          }
          
          .nav-btn:hover {
            opacity: 1;
            background-color: rgba(255,255,255,0.05) !important;
          }
          
          .nav-btn.active {
            opacity: 1;
            background-color: var(--color-primary) !important;
            color: #ffffff !important; /* Always white text on active primary button */
            font-weight: 600;
          }
          
          .nav-btn i {
            color: inherit !important; /* Icons inherit text color */
          }
          
          /* Override Bootstrap Link Colors */
          a, .btn-link {
            color: var(--color-primary);
          }
          
          a:hover, .btn-link:hover {
            color: var(--color-secondary);
          }

          /* Mobile Feed Optimization */
          @media (max-width: 768px) {
            .mobile-feed-container {
              padding: 0 !important;
              background-color: var(--color-bg) !important;
            }

            .feed-card {
              border-radius: 0 !important;
              border-left: none !important;
              border-right: none !important;
              border-top: none !important;
              border-bottom: 1px solid rgba(255,255,255,0.05) !important;
              margin-bottom: 0 !important;
              box-shadow: none !important;
              background-color: var(--color-surface) !important;
            }
            
            .feed-header {
              padding: 12px 12px 0 12px !important;
              margin-bottom: 4px !important;
              display: flex;
              align-items: center;
            }
            
            .conversation-avatar-sm {
               width: 32px !important;
               height: 32px !important;
               font-size: 0.8rem !important;
            }

            .feed-content {
              font-size: 15px !important;
              line-height: 1.5 !important;
              padding: 4px 12px 12px 12px !important;
              margin-bottom: 0 !important;
            }
            
            .feed-actions {
              padding: 8px 12px !important;
              border-top: none !important;
              justify-content: flex-start !important;
              gap: 24px !important;
            }

            .feed-actions .btn {
              padding: 0 !important;
              font-size: 18px !important;
              background-color: transparent !important;
              border-radius: 0;
              color: var(--color-textSecondary) !important;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            
            .feed-actions .btn span {
               font-size: 14px !important;
               font-weight: 500;
            }
            
            .feed-actions .btn:hover, .feed-actions .btn:active {
              background-color: transparent !important;
              color: var(--color-text) !important;
            }

            /* Full width images on mobile */
            .feed-image {
              width: 100% !important;
              margin: 0 !important;
              border-radius: 0 !important;
              display: block;
            }
          }
          
          /* General Mobile Improvements */
          @media (max-width: 576px) {
            .container, .container-fluid {
              padding-left: 12px !important;
              padding-right: 12px !important;
            }
            
            .btn-lg-mobile {
              padding: 12px 20px !important;
              font-size: 1.1rem !important;
            }
            
            .modal-dialog {
              margin: 0.5rem !important;
            }
          }
            .modal-dialog {
              margin: 0.5rem !important;
            }
          }

          /* Desktop Sticky Sidebar */
          @media (min-width: 992px) {
            .desktop-sticky {
              position: sticky;
              top: 20px;
              z-index: 1000;
            }
          }
        `}</style>
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
            <div className="d-flex gap-2">
              <Button
                variant="light"
                size="sm"
                onClick={() => setActivePane('study-sync')}
                className="me-1"
              >
                <i className="fas fa-fire text-danger"></i>
              </Button>
              <Button
                variant="light"
                size="sm"
                onClick={() => setShowThemePicker(true)}
              >
                <i className="fas fa-palette text-muted"></i>
              </Button>
              <Button
                variant="light"
                size="sm"
                className="position-relative me-3"
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              >
                <i className={`fas fa-bell ${showNotificationPanel ? 'text-primary' : 'text-muted'}`}></i>
                {unreadNotificationCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.5rem' }}>
                    {unreadNotificationCount}
                  </span>
                )}
              </Button>
              <Button variant="light" size="sm" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt text-danger"></i>
              </Button>
            </div>
          )}
        </div>


        {/* Sidebar Navigation (Desktop Only) */}
        <div className="d-none d-lg-block">
          <PortalSidebar
            student={student}
            activePane={activePane}
            setActivePane={setActivePane}
            showNotificationPanel={showNotificationPanel}
            setShowNotificationPanel={setShowNotificationPanel}
            unreadNotificationCount={unreadNotificationCount}
            portalMeta={portalMeta}
            handleLogout={handleLogout}
            setShowThemePicker={setShowThemePicker}
            className="position-fixed top-0 start-0 z-index-fixed"
          />
        </div>


        {/* Main Content Area */}
        <div className={`flex-grow-1 ${student ? 'ms-lg-auto' : ''}`} style={{ marginLeft: 0, width: '100%' }}>
          <div className="container-fluid p-0">
            {student && (
              <div className="d-lg-none bg-white border-top position-fixed bottom-0 start-0 end-0 shadow-lg d-flex justify-content-between align-items-center px-2 py-1" 
                   style={{ zIndex: 1050, height: '70px', paddingBottom: 'env(safe-area-inset-bottom, 10px)' }}>
                <div className="d-flex w-100 align-items-center justify-content-between" style={{ overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
                  {['profile', 'community', 'feed', 'study-sync', 'help', 'library', 'groups', 'settings'].map(pane => (
                    <Button
                      key={pane}
                      variant={activePane === pane ? 'primary-soft' : 'link'}
                      size="sm"
                      className={`d-flex flex-column align-items-center justify-content-center border-0 rounded-3 mx-1 ${activePane === pane ? 'text-primary bg-primary bg-opacity-10' : 'text-muted'}`}
                      onClick={() => setActivePane(pane)}
                      style={{ minWidth: '60px', height: '56px' }}
                    >
                      <i className={`fas fa-${pane === 'profile' ? 'user' : pane === 'community' ? 'users' : pane === 'groups' ? 'comments' : pane === 'study-sync' ? 'fire' : pane === 'help' ? 'hands-helping' : pane === 'library' ? 'book' : pane === 'feed' ? 'rss' : 'cog'} mb-1`} style={{ fontSize: '1.2rem' }}></i>
                      <span style={{ fontSize: '0.65rem', fontWeight: activePane === pane ? 'bold' : 'normal' }}>
                        {pane === 'study-sync' ? 'Sync' : pane === 'library' ? 'Archive' : pane.charAt(0).toUpperCase() + pane.slice(1)}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className={`p-3 p-lg-5 ${activePane === 'feed' ? 'p-0 p-lg-5' : ''}`} style={{ maxWidth: 1200, marginLeft: 'auto', marginRight: 'auto', paddingBottom: '100px' }}>
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
                              A single space for every Windsor yuvak&apos;s journey. Connect, grow, and support each other.
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
                                <div className="row g-2 mb-3">
                                  <div className="col-6">
                                    <Form.Group controlId="register-first-name">
                                      <Form.Label className="fw-semibold small text-muted text-uppercase">First Name</Form.Label>
                                      <Form.Control
                                        type="text"
                                        size="lg"
                                        placeholder="First Name"
                                        value={registerFirstName}
                                        onChange={(e) => setRegisterFirstName(e.target.value)}
                                        required
                                        className="bg-light border-0"
                                      />
                                    </Form.Group>
                                  </div>
                                  <div className="col-6">
                                    <Form.Group controlId="register-last-name">
                                      <Form.Label className="fw-semibold small text-muted text-uppercase">Last Name</Form.Label>
                                      <Form.Control
                                        type="text"
                                        size="lg"
                                        placeholder="Last Name"
                                        value={registerLastName}
                                        onChange={(e) => setRegisterLastName(e.target.value)}
                                        required
                                        className="bg-light border-0"
                                      />
                                    </Form.Group>
                                  </div>
                                </div>

                                <div className="row g-2 mb-3">
                                  <div className="col-6">
                                    <Form.Group controlId="register-mandal">
                                      <Form.Label className="fw-semibold small text-muted text-uppercase">Mandal</Form.Label>
                                      <Form.Select
                                        size="lg"
                                        value={registerMandal}
                                        onChange={(e) => setRegisterMandal(e.target.value)}
                                        required
                                        className="bg-light border-0"
                                      >
                                        <option value="">Select...</option>
                                        {MANDAL_OPTIONS.map(opt => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </Form.Select>
                                    </Form.Group>
                                  </div>
                                  <div className="col-6">
                                    <Form.Group controlId="register-mukt-type">
                                      <Form.Label className="fw-semibold small text-muted text-uppercase">Mukt Type</Form.Label>
                                      <Form.Select
                                        size="lg"
                                        value={registerMuktType}
                                        onChange={(e) => setRegisterMuktType(e.target.value)}
                                        required
                                        className="bg-light border-0"
                                      >
                                        <option value="">Select...</option>
                                        {MUKT_OPTIONS.map(opt => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </Form.Select>
                                    </Form.Group>
                                  </div>
                                </div>
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
                              <p className="text-muted mb-0">
                                {isEditingProfile
                                  ? 'Update your personal details below.'
                                  : 'View your profile and activity history.'}
                              </p>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              {updateLoading && <Spinner animation="border" variant="primary" size="sm" />}
                              <Button
                                variant={isEditingProfile ? 'outline-secondary' : 'primary'}
                                onClick={() => {
                                   setIsEditingProfile(!isEditingProfile);
                                   // Reset activity history view when switching modes
                                   if (!isEditingProfile) setShowActivityHistory(false); 
                                }}
                                disabled={updateLoading}
                                size="sm"
                              >
                                {isEditingProfile ? (
                                  <>
                                    <i className="fas fa-times me-2"></i>Cancel Edit
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-pen me-2"></i>Edit Profile
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="col-lg-8">
                          {isEditingProfile ? (
                            <>
                              <Form onSubmit={handleUpdate} className="student-portal-form mb-4" noValidate>
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
                              
                              {/* Security Settings - Only in Edit Mode */}
                              {renderSecuritySettings()}
                            </>
                          ) : (
                            <div className="d-flex flex-column gap-4">
                               {/* View Activity History Button */}
                               <div className="d-grid mb-2">
                                  <Button 
                                    variant="outline-primary" 
                                    size="lg" 
                                    className="d-flex align-items-center justify-content-center gap-2 py-3"
                                    onClick={() => setShowActivityHistory(!showActivityHistory)}
                                  >
                                    <i className={`fas ${showActivityHistory ? 'fa-chevron-up' : 'fa-history'}`}></i>
                                    {showActivityHistory ? 'Hide Activity History' : 'View Activity History'}
                                  </Button>
                               </div>

                               {showActivityHistory && (
                                   <div className="card-modern p-4 animate__animated animate__fadeIn">
                                      <h5 className="fw-bold mb-4">Activity History</h5>
                                      {feedPosts?.filter(p => String(p.author?._id || p.author?.id) === String(student?._id || student?.id)).length > 0 ? (
                                          <Feed
                                             posts={feedPosts.filter(p => String(p.author?._id || p.author?.id) === String(student?._id || student?.id))}
                                             users={[]}
                                             currentUser={student}
                                             onLikePost={handleLikePost}
                                             onFollowUser={handleFollow}
                                             onMessageUser={(user) => {
                                                 setActivePane('community');
                                                 openConversationWithStudent(user);
                                             }}
                                             onCreatePost={null}
                                             postContent=""
                                             onPostContentChange={() => {}}
                                             isSubmitting={false}
                                             onToggleComments={handleLoadComments}
                                             onSharePost={handleSharePost}
                                             showComments={showComments}
                                             postComments={postComments}
                                             commentDrafts={commentDrafts}
                                             onCommentChange={(postId, val) => setCommentDrafts(prev => ({ ...prev, [postId]: val }))}
                                             onCommentSubmit={handleCommentSubmit}
                                             onDeleteComment={handleDeleteComment}
                                             onUpdateComment={handleUpdateComment}
                                          />
                                      ) : (
                                          <div className="text-center text-muted py-5">
                                              <div className="mb-3">
                                                  <i className="fas fa-history fa-2x opacity-50"></i>
                                              </div>
                                              <p>No activity yet. Share your first post in the Feed!</p>
                                              <Button variant="outline-primary" size="sm" onClick={() => setActivePane('feed')}>
                                                  Go to Feed
                                              </Button>
                                          </div>
                                      )}
                                   </div>
                               )}
                            </div>
                          )}
                        </div>
                        <div className="col-lg-4">
                          <div className="desktop-sticky" style={{ top: 20 }}>
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

                    {activePane === 'study-sync' && (
                      <div className="h-100">
                        <StudySyncView
                          student={student}
                          portalAuthHeaders={portalAuthHeaders}
                          onConnect={(targetStudent) => {
                            setActivePane('community');
                            openConversationWithStudent(targetStudent);
                          }}
                        />
                      </div>
                    )}

                    {activePane === 'groups' && (
                      <div className="h-100">
                        <GroupsView
                          student={student}
                          portalAuthHeaders={portalAuthHeaders}
                        />
                      </div>
                    )}

                    {activePane === 'feed' && (
                      <div className="h-100">
                        {renderFeedPane()}
                      </div>
                    )}

                    {activePane === 'help' && (
                      <div className="h-100">
                        {renderHelpPane()}
                      </div>
                    )}

                    {activePane === 'library' && (
                      <div className="h-100">
                        <DigitalLibrary currentUser={student} portalAuthHeaders={portalAuthHeadersRef.current} />
                      </div>
                    )}



                    {activePane === 'settings' && (
                      <div className="row justify-content-center">
                        <div className="col-lg-6">
                          <div className="d-flex align-items-center justify-content-between mb-4">
                            <div>
                              <h2 className="fw-bold mb-1 text-dark">Settings</h2>
                              <p className="text-muted mb-0">Manage your account and preferences.</p>
                            </div>
                          </div>
                          {renderAccountPane()}
                        </div>
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

      {/* Follow/Likes List Modal - Reusing Follow Modal structure or creating new? Creating simple new one for now */}
       <Modal show={showLikesModal} onHide={() => setShowLikesModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="h5">{likesModalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <ListGroup variant="flush">
            {likesModalUsers && likesModalUsers.length > 0 ? (
              likesModalUsers.map((user) => (
                <ListGroup.Item key={user.id} className="d-flex align-items-center justify-content-between p-3 border-light">
                  <div className="d-flex align-items-center gap-3">
                    <div 
                      className="rounded-circle bg-light d-flex align-items-center justify-content-center text-primary fw-bold"
                      style={{ width: '40px', height: '40px', fontSize: '1rem' }}
                    >
                      {user.name.charAt(0)}
                    </div>
                    <span className="fw-medium text-dark">{user.name}</span>
                  </div>
                 {/*  Future: Add Follow button here if not following */}
                </ListGroup.Item>
              ))
            ) : (
              <div className="text-center p-4 text-muted">No likes yet</div>
            )}
          </ListGroup>
        </Modal.Body>
      </Modal>

      {/* Theme Picker Modal */}
      {showThemePicker && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2100,
            padding: '1rem'
          }}
          onClick={() => setShowThemePicker(false)}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              border: '2px solid var(--color-primary)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <i className="fas fa-palette" style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}></i>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: 'var(--color-text)' }}>Choose Your Theme</h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem'
            }}>
              {[
                { id: 'cyberpunk', name: 'Cyberpunk', primary: '#ff006e', secondary: '#00f5ff', accent: '#9d4edd' },
                { id: 'ocean', name: 'Ocean Depths', primary: '#00d4ff', secondary: '#ff6b9d', accent: '#4ecdc4' },
                { id: 'sunset', name: 'Desert Sunset', primary: '#ff8c42', secondary: '#ff6b9d', accent: '#ffd670' },
                { id: 'forest', name: 'Forest Whisper', primary: '#7cb342', secondary: '#a8d5ba', accent: '#f4a460' },
                { id: 'aurora', name: 'Northern Lights', primary: '#00ff87', secondary: '#b967ff', accent: '#05d9e8' },
                { id: 'light', name: 'Clean Light', primary: '#5b7fff', secondary: '#ff6b9d', accent: '#ffd166' },
                { id: 'dark', name: 'Midnight', primary: '#bb86fc', secondary: '#03dac6', accent: '#cf6679' }
              ].map((themeOption) => {
                const isActive = theme === themeOption.id;

                return (
                  <button
                    key={themeOption.id}
                    onClick={() => {
                      setTheme(themeOption.id);
                      setShowThemePicker(false);
                      enqueueToast({
                        variant: 'success',
                        title: 'Theme Changed',
                        message: `Welcome to ${themeOption.name}!`
                      });
                    }}
                    style={{
                      background: isActive ? 'var(--color-bg)' : 'transparent',
                      border: `2px solid ${isActive ? themeOption.primary : 'transparent'}`,
                      borderRadius: '12px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.borderColor = themeOption.primary;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      if (!isActive) e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <div style={{ fontSize: '2rem' }}>
                      {themeOption.id === 'cyberpunk' ? '⚡' :
                        themeOption.id === 'ocean' ? '🌊' :
                          themeOption.id === 'sunset' ? '🌅' :
                            themeOption.id === 'forest' ? '🌲' :
                              themeOption.id === 'aurora' ? '⭐' :
                                themeOption.id === 'light' ? '☀️' :
                                  '🌙'}
                    </div>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 'bold' : 'normal',
                      color: isActive ? themeOption.primary : 'var(--color-text)'
                    }}>
                      {themeOption.name}
                    </span>
                    <div style={{
                      display: 'flex',
                      gap: '4px',
                      marginTop: '0.25rem'
                    }}>
                      {[themeOption.primary, themeOption.secondary, themeOption.accent].map((color, i) => (
                        <div
                          key={i}
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: color
                          }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Notification Panel */}
      <Offcanvas
        show={showNotificationPanel}
        onHide={() => setShowNotificationPanel(false)}
        placement="end"
        className="border-0 shadow-lg bg-surface text-main"
      >
        <Offcanvas.Header closeButton className="border-bottom bg-surface text-main">
          <Offcanvas.Title className="fw-bold">
            Notifications
            {unreadNotificationCount > 0 && (
              <Badge bg="danger" className="ms-2 rounded-pill">
                {unreadNotificationCount}
              </Badge>
            )}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          {notifications.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="far fa-bell fa-3x mb-3 opacity-50"></i>
              <p>No notifications yet</p>
            </div>
          ) : (
            <ListGroup variant="flush">
              {notifications.map((notif) => (
                <ListGroup.Item
                  key={notif.id}
                  className={`p-3 border-bottom bg-surface text-main ${!notif.read ? 'bg-body' : ''}`}
                  action
                >
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <strong className={!notif.read ? 'text-primary' : 'text-main'}>
                      {notif.title}
                    </strong>
                    <div className="d-flex align-items-center gap-2">
                        <small className="text-muted">
                        {notif.timestamp ? formatConversationTimestamp(notif.timestamp) : 'Just now'}
                        </small>
                        <Button
                            variant="link"
                            className="p-0 text-muted"
                            size="sm"
                            style={{ lineHeight: 1, minWidth: 'auto' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notif.id);
                            }}
                        >
                            <i className="fas fa-times"></i>
                        </Button>
                    </div>
                  </div>
                  <p className="mb-2 text-muted small">{notif.message}</p>

                  {/* Action Buttons for Follow Requests */}
                  {(notif.actionType === 'follow_request' || notif.type === 'follow_request') && !notif.read && (
                    <div className="d-flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="primary"
                        className="flex-grow-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollow(notif.userId, 'accept');
                          markNotificationAsRead(notif.id);
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        className="flex-grow-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollow(notif.userId, 'reject');
                          markNotificationAsRead(notif.id);
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Offcanvas.Body>
        {(unreadNotificationCount > 0 || notifications.some(n => n.read)) && (
          <div className="p-3 border-top bg-surface d-flex flex-column gap-2">
            {unreadNotificationCount > 0 && (
              <Button
                variant="outline-primary"
                size="sm"
                className="w-100"
                onClick={markAllNotificationsAsRead}
                disabled={markingAll}
              >
                {markingAll ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Marking as read...
                  </>
                ) : (
                  'Mark all as read'
                )}
              </Button>
            )}

            {notifications.some(n => n.read) && (
              <Button
                variant="outline-secondary"
                size="sm"
                className="w-100"
                onClick={clearReadNotifications}
                disabled={clearingRead}
              >
                {clearingRead ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Clearing...
                  </>
                ) : (
                  'Clear read notifications'
                )}
              </Button>
            )}
          </div>
        )}
      </Offcanvas>

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
                    {renderAvatar(activeConversation)}
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

          {/* Typing Indicator */}
          {isTyping && (
            <div className="px-4 py-2 text-muted small fst-italic bg-white border-top">
              <span className="typing-dots me-2">
                <span>.</span><span>.</span><span>.</span>
              </span>
              {activeConversation.first_name} is typing
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-white border-top">
            <Form onSubmit={handleSendConversationMessage}>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  placeholder="Type a message..."
                  value={messageDraft}
                  onChange={(e) => handleTyping(e)}
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
            <div className="d-lg-none" style={{ height: 80 }}></div>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Comments Delete Confirmation Modal */}
      <Modal show={showDeleteCommentModal} onHide={() => setShowDeleteCommentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Comment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this comment? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteCommentModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteComment}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Post Delete Confirmation Modal */}
      <Modal show={showDeletePostModal} onHide={() => setShowDeletePostModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Post</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this post? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeletePostModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeletePost}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Followers/Following Modal */}
      <Modal show={showFollowModal} onHide={() => setShowFollowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {followModalType === 'followers' ? 'Followers' : 'Following'}
            {followList.length > 0 && (
               <span className="text-muted ms-2 fw-normal" style={{ fontSize: '1rem' }}>
                 ({followList.reduce((unique, item) => {
                    const id = item.id || item._id;
                    return unique.includes(id) ? unique : [...unique, id];
                 }, []).length})
               </span>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {followListLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : (
            <ListGroup variant="flush">
              {/* Deduplicate users by ID */}
              {followList
                .filter((user, index, self) => 
                  index === self.findIndex((u) => (u.id || u._id) === (user.id || user._id))
                )
                .map((user) => {
                const userId = user.id || user._id;
                const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'User';
                const initials = displayName.charAt(0).toUpperCase();

                return (
                  <ListGroup.Item key={userId} className="d-flex align-items-center justify-content-between p-3 border-light">
                    <div className="d-flex align-items-center gap-3">
                      <div 
                        className="rounded-circle bg-light d-flex align-items-center justify-content-center text-primary fw-bold"
                        style={{ width: '40px', height: '40px', fontSize: '1rem' }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div className="fw-medium text-dark">{displayName}</div>
                        {user.study && <div className="small text-muted" style={{ fontSize: '0.85rem' }}>{user.study}</div>}
                      </div>
                    </div>
                    {user.online ? <Badge bg="success" pill>Online</Badge> : <small className="text-muted">Offline</small>}
                  </ListGroup.Item>
                );
              })}
              {followList.length === 0 && (
                <div className="text-center p-4 text-muted">No users found</div>
              )}
            </ListGroup>
          )}
        </Modal.Body>
      </Modal>

      {/* Notification Panel */}


      <CustomToastContainer notifications={toastQueue} removeNotification={removeToast} />

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
        .typing-dots span {
          animation: typing 1.4s infinite ease-in-out both;
          display: inline-block;
          margin: 0 1px;
          font-size: 1.5rem;
          line-height: 0.5;
        }
        .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes typing {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
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

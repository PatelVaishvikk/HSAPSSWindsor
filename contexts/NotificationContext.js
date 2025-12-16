import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NotificationContext = createContext();

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load history from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('notification_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load notification history', e);
    }
  }, []);

  // Save history when it changes
  useEffect(() => {
    localStorage.setItem('notification_history', JSON.stringify(history));
  }, [history]);

  const show = useCallback((message, type = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const notification = { id, message, type, timestamp: new Date().toISOString(), read: false };
    
    // Add to active toasts
    setToasts(prev => [...prev, notification]);
    
    // Add to history
    setHistory(prev => [notification, ...prev].slice(0, 50)); // Limit to last 50
    setUnreadCount(prev => prev + 1);

    // Auto-remove toast after 3 seconds (User Request)
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
    setHistory(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setUnreadCount(0);
  }, []);

  const removeHistoryItem = useCallback((id) => {
    setHistory(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = {
    toasts,
    history,
    unreadCount,
    show,
    removeToast,
    markAllRead,
    clearHistory,
    removeHistoryItem
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

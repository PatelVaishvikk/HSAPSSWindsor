import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to manage temporary toast notifications.
 * Can be connected to Socket.IO for real-time alerts.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((type, title, message) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, type, title, message }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Socket.IO Listener
  useEffect(() => {
    // We expect the global 'io' or socket hook to trigger this, 
    // but since this hook might be used at app level, we can listen to window events
    // or direct socket events if we access the socket instance.
    
    // For now, let's expose a helper on window to test from console
    window.triggerNotification = (type, title, msg) => addNotification(type, title, msg);

    // If we have a global socket instance connected:
    /*
    if (global.socket) {
        global.socket.on('notification', (data) => {
            addNotification(data.type, data.title, data.message);
        });
    }
    */
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification
  };
}

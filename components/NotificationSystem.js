import React, { useState } from 'react';
import { Toast, ToastContainer, Offcanvas, ListGroup, Badge, Button } from 'react-bootstrap';
import { useNotification } from '../contexts/NotificationContext';

export default function GlobalNotifications() {
  const { toasts, removeToast } = useNotification();

  return (
    <ToastContainer className="p-3 position-fixed top-0 end-0" style={{ zIndex: 1060 }}>
      {toasts.map(toast => (
        <Toast 
          key={toast.id} 
          onClose={() => removeToast(toast.id)} 
          show={true} 
          bg={toast.type === 'error' ? 'danger' : toast.type}
        >
          <Toast.Header closeButton={true}>
            <strong className="me-auto">{toast.type === 'error' ? 'Error' : toast.type === 'success' ? 'Success' : 'Notification'}</strong>
            <small>Just now</small>
          </Toast.Header>
          <Toast.Body className={toast.type === 'dark' ? 'text-white' : ''}>
            {toast.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
}

export function NotificationPanel({ show, onHide }) {
  const { history, clearHistory, removeHistoryItem, unreadCount, markAllRead } = useNotification();

  // Mark read when panel opens
  React.useEffect(() => {
    if (show && unreadCount > 0) {
      markAllRead();
    }
  }, [show, unreadCount, markAllRead]);

  return (
    <Offcanvas show={show} onHide={onHide} placement="end" style={{ width: '400px' }}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>
          <i className="fas fa-bell me-2"></i> Notifications
        </Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        {history.length > 0 ? (
          <>
            <div className="d-flex justify-content-end mb-3">
              <Button variant="outline-danger" size="sm" onClick={clearHistory}>
                Clear All
              </Button>
            </div>
            <ListGroup variant="flush">
              {history.map(item => (
                <ListGroup.Item key={item.id} className="d-flex justify-content-between align-items-start bg-light mb-2 rounded border-0">
                  <div className="ms-2 me-auto">
                    <div className="fw-bold text-capitalize">
                      <i className={`fas fa-${item.type === 'success' ? 'check-circle text-success' : item.type === 'danger' || item.type === 'error' ? 'exclamation-circle text-danger' : 'info-circle text-primary'} me-2`}></i>
                      {item.type === 'error' ? 'Error' : item.type}
                    </div>
                    {item.message}
                    <div className="text-muted small mt-1">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <Button variant="link" size="sm" className="text-muted p-0" onClick={() => removeHistoryItem(item.id)}>
                    <i className="fas fa-times"></i>
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </>
        ) : (
          <div className="text-center text-muted mt-5">
            <i className="fas fa-bell-slash fa-3x mb-3 opacity-25"></i>
            <p>No notifications yet</p>
          </div>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}

import React, { useEffect, useState } from 'react';
import { Toast, ToastContainer as BSContainer } from 'react-bootstrap';
import { Bell, MessageCircle, Heart, Info, X } from 'lucide-react';

export default function ToastContainer({ notifications = [], removeNotification }) {
  return (
    <BSContainer className="p-3 position-fixed" style={{ top: '80px', right: '20px', zIndex: 9999, pointerEvents: 'none', maxWidth: '400px' }}>
      {notifications.map((notif) => (
        <Toast
          key={notif.id}
          onClose={() => removeNotification(notif.id)}
          show={true}
          delay={3000}
          autohide
          className="mb-3 shadow-lg border-0 overflow-hidden fade-in-up"
          style={{ 
            pointerEvents: 'auto', 
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            width: '100%'
          }}
        >
          <div className={`toast-header border-0 text-white ${getBgClass(notif.type || notif.variant)}`}>
            {getIcon(notif.type || notif.variant)}
            <strong className="me-auto ms-2">{notif.title}</strong>
            <small className="text-white-50">Just now</small>
            <button 
                type="button" 
                className="btn-close btn-close-white ms-2" 
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notif.id);
                }}
            />
          </div>
          <Toast.Body className="text-dark fw-medium">
            {notif.message}
          </Toast.Body>
        </Toast>
      ))}
    </BSContainer>
  );
}

function getBgClass(type) {
  switch (type) {
    case 'like': return 'bg-danger';
    case 'comment': return 'bg-primary';
    case 'message': return 'bg-success';
    default: return 'bg-dark';
  }
}

function getIcon(type) {
  switch (type) {
    case 'like': return <Heart size={16} fill="white" />;
    case 'comment': return <MessageCircle size={16} fill="white" />;
    case 'message': return <Bell size={16} fill="white" />;
    default: return <Info size={16} />;
  }
}


import React from 'react';
import { buildInitials } from '../../lib/studentPortalUtils';

export default function PortalAvatar({ profile, className = "w-100 h-100 rounded-circle object-fit-cover shadow-sm" }) {
  if (profile?.profile_picture) {
    return (
      <img
        src={profile.profile_picture}
        alt={`${profile.first_name || ''} ${profile.last_name || ''}`}
        className={className}
      />
    );
  }

  const initials = buildInitials(profile?.first_name, profile?.last_name);
  
  // Use a hash of the name to pick a consistent background color
  const colors = ['#6366f1', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
  const nameHash = (profile?.first_name || '').length + (profile?.last_name || '').length;
  const bgColor = colors[nameHash % colors.length];

  return (
    <div 
      className="d-flex align-items-center justify-content-center fw-bold text-white rounded-circle shadow-sm"
      style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: bgColor,
        fontSize: '1.2rem',
        letterSpacing: '0.5px',
        userSelect: 'none',
        aspectRatio: '1/1'
      }}
    >
      {initials}
    </div>
  );
}

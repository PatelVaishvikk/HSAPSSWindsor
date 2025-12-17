
import React from 'react';
import { buildInitials } from '../../lib/studentPortalUtils';

export default function PortalAvatar({ profile, className = "w-100 h-100 rounded-circle object-fit-cover" }) {
  if (profile?.profile_picture) {
    return (
      <img
        src={profile.profile_picture}
        alt={`${profile.first_name || ''} ${profile.last_name || ''}`}
        className={className}
      />
    );
  }
  return buildInitials(profile?.first_name, profile?.last_name);
}

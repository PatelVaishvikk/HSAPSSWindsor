import mongoose from 'mongoose';

const WorkspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  members: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    joined_at: {
      type: Date,
      default: Date.now
    },
    permissions: {
      can_edit: { type: Boolean, default: true },
      can_delete: { type: Boolean, default: false },
      can_invite: { type: Boolean, default: false }
    }
  }],
  type: {
    type: String,
    enum: ['project', 'study_group', 'research', 'startup', 'other'],
    default: 'project'
  },
  visibility: {
    type: String,
    enum: ['private', 'members_only', 'public'],
    default: 'members_only'
  },
  tags: [{
    type: String,
    trim: true
  }],
  tasks: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'done'],
      default: 'todo'
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    due_date: Date,
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    completed_at: Date
  }],
  files: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    uploaded_at: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1
    }
  }],
  whiteboard_data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  meetings: [{
    title: String,
    scheduled_at: Date,
    duration_minutes: Number,
    attendees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    }],
    meeting_url: String,
    notes: String,
    created_at: {
      type: Date,
      default: Date.now
    }
  }],
  activity_log: [{
    action: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    details: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'on_hold', 'completed', 'archived'],
    default: 'active'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

WorkspaceSchema.index({ owner: 1, status: 1 });
WorkspaceSchema.index({ 'members.student': 1 });
WorkspaceSchema.index({ tags: 1 });

WorkspaceSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

export default mongoose.models.Workspace || mongoose.model('Workspace', WorkspaceSchema);

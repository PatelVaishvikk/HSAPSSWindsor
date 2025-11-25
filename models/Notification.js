import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  type: {
    type: String,
    enum: ['follow_request', 'follow_accept', 'unfollow', 'like', 'comment', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  created_at: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 30 // Auto-delete after 30 days
  }
});

// Index for fetching user's notifications sorted by date
NotificationSchema.index({ recipient: 1, created_at: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

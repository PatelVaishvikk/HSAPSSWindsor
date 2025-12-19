import mongoose from 'mongoose';

const { Schema } = mongoose;

const MentorshipSchema = new Schema({
  mentor: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  mentee: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'declined', 'cancelled'],
    default: 'pending',
    index: true
  },
  category: {
    type: String,
    enum: ['academic', 'career', 'settling_in', 'spiritual', 'other'],
    default: 'academic'
  },
  message: {
    type: String,
    trim: true,
    maxlength: 500
  },
  goals: {
    type: [String],
    default: []
  },
  notes: {
    type: String,
    trim: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  started_at: {
    type: Date
  },
  completed_at: {
    type: Date
  }
});

// Compound index to prevent duplicate active mentorships between same pair
MentorshipSchema.index({ mentor: 1, mentee: 1, status: 1 });

MentorshipSchema.pre('save', function(next) {
  this.updated_at = new Date();
  if (this.isModified('status') && this.status === 'active' && !this.started_at) {
    this.started_at = new Date();
  }
  if (this.isModified('status') && this.status === 'completed' && !this.completed_at) {
    this.completed_at = new Date();
  }
  next();
});

export default mongoose.models.Mentorship || mongoose.model('Mentorship', MentorshipSchema);

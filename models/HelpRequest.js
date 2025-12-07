import mongoose from 'mongoose';

const { Schema } = mongoose;

const HelpResponseSchema = new Schema(
  {
    responder: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    message: {
      type: String,
      trim: true,
      required: true
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const HelpRequestSchema = new Schema({
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  title: {
    type: String,
    trim: true,
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  tags: {
    type: [String],
    default: []
  },
  category: {
    type: String,
    enum: ['Housing', 'Jobs', 'Rides', 'Academic', 'Food', 'General', 'Legal', 'Events'],
    default: 'General',
    index: true
  },
  urgency: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
    index: true
  },
  location: {
    type: String,
    trim: true,
    default: 'Windsor'
  },
  is_anonymous: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open',
    index: true
  },
  responses: {
    type: [HelpResponseSchema],
    default: []
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

HelpRequestSchema.pre('save', function handleTimestamp(next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.models.HelpRequest || mongoose.model('HelpRequest', HelpRequestSchema);

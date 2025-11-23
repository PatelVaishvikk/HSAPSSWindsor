import mongoose from 'mongoose';

const OpportunitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['job', 'internship', 'freelance', 'collaboration', 'mentorship', 'co_founder', 'research', 'volunteer'],
    index: true
  },
  posted_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  company: {
    name: String,
    website: String,
    logo: String
  },
  location: {
    type: String,
    trim: true
  },
  remote: {
    type: Boolean,
    default: false
  },
  compensation: {
    type: {
      type: String,
      enum: ['salary', 'hourly', 'project', 'equity', 'unpaid', 'negotiable']
    },
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    equity_percentage: Number
  },
  required_skills: [{
    type: String,
    trim: true
  }],
  preferred_skills: [{
    type: String,
    trim: true
  }],
  experience_level: {
    type: String,
    enum: ['entry', 'junior', 'mid', 'senior', 'any'],
    default: 'any'
  },
  commitment: {
    type: String,
    enum: ['full_time', 'part_time', 'contract', 'flexible'],
    default: 'full_time'
  },
  duration: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months', 'years', 'ongoing']
    }
  },
  start_date: {
    type: Date
  },
  application_deadline: {
    type: Date
  },
  application_url: {
    type: String,
    trim: true
  },
  contact_email: {
    type: String,
    trim: true
  },
  applications: [{
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    message: String,
    resume_url: String,
    portfolio_url: String,
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'shortlisted', 'rejected', 'accepted'],
      default: 'pending'
    },
    applied_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  saves: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['open', 'closed', 'filled', 'draft'],
    default: 'open',
    index: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  expires_at: {
    type: Date
  }
});

OpportunitySchema.index({ type: 1, status: 1 });
OpportunitySchema.index({ required_skills: 1 });
OpportunitySchema.index({ tags: 1 });
OpportunitySchema.index({ created_at: -1 });
OpportunitySchema.index({ posted_by: 1, status: 1 });

OpportunitySchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Auto-close if past deadline
  if (this.application_deadline && new Date() > this.application_deadline && this.status === 'open') {
    this.status = 'closed';
  }
  
  next();
});

// Virtual for application count
OpportunitySchema.virtual('application_count').get(function() {
  return this.applications.length;
});

// Virtual for save count
OpportunitySchema.virtual('save_count').get(function() {
  return this.saves.length;
});

export default mongoose.models.Opportunity || mongoose.model('Opportunity', OpportunitySchema);

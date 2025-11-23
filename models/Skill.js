import mongoose from 'mongoose';

const SkillSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  category: {
    type: String,
    enum: ['technical', 'soft', 'language', 'tool', 'domain', 'other'],
    default: 'other'
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'beginner'
  },
  verified: {
    type: Boolean,
    default: false
  },
  verification_method: {
    type: String,
    enum: ['challenge', 'endorsement', 'certificate', 'project', 'none'],
    default: 'none'
  },
  verification_date: {
    type: Date,
    default: null
  },
  last_verified: {
    type: Date,
    default: null
  },
  endorsements: [{
    endorser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    endorser_name: String,
    endorser_level: String,
    weight: {
      type: Number,
      default: 1
    },
    message: String,
    created_at: {
      type: Date,
      default: Date.now
    }
  }],
  endorsement_count: {
    type: Number,
    default: 0
  },
  projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio'
  }],
  years_experience: {
    type: Number,
    default: 0
  },
  last_used: {
    type: Date,
    default: Date.now
  },
  offering_help: {
    type: Boolean,
    default: false
  },
  seeking_help: {
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
  }
});

SkillSchema.index({ student: 1, name: 1 }, { unique: true });
SkillSchema.index({ name: 1, verified: 1 });

SkillSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  this.endorsement_count = this.endorsements.length;
  next();
});

export default mongoose.models.Skill || mongoose.model('Skill', SkillSchema);

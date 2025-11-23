import mongoose from 'mongoose';

const LearningPathSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['lesson', 'course', 'study_session', 'workshop', 'challenge'],
    default: 'lesson'
  },
  category: {
    type: String,
    enum: ['technical', 'business', 'design', 'soft_skills', 'language', 'other'],
    default: 'other'
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration_minutes: {
    type: Number,
    default: 5
  },
  content: {
    type: String,
    required: true
  },
  content_type: {
    type: String,
    enum: ['text', 'video', 'interactive', 'mixed'],
    default: 'text'
  },
  video_url: {
    type: String,
    trim: true
  },
  resources: [{
    title: String,
    url: String,
    type: String
  }],
  skills_taught: [{
    type: String,
    trim: true
  }],
  prerequisites: [{
    type: String,
    trim: true
  }],
  learning_objectives: [{
    type: String,
    trim: true
  }],
  quiz: [{
    question: String,
    options: [String],
    correct_answer: Number,
    explanation: String
  }],
  live_session: {
    scheduled_at: Date,
    duration_minutes: Number,
    meeting_url: String,
    max_participants: Number,
    registered: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    }]
  },
  enrollments: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    enrolled_at: {
      type: Date,
      default: Date.now
    },
    completed: {
      type: Boolean,
      default: false
    },
    completed_at: Date,
    progress: {
      type: Number,
      default: 0
    },
    quiz_score: Number,
    certificate_issued: {
      type: Boolean,
      default: false
    }
  }],
  knowledge_points: {
    type: Number,
    default: 10
  },
  tags: [{
    type: String,
    trim: true
  }],
  visibility: {
    type: String,
    enum: ['public', 'connections', 'private'],
    default: 'public'
  },
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  ratings: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    created_at: {
      type: Date,
      default: Date.now
    }
  }],
  average_rating: {
    type: Number,
    default: 0
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

const SkillSwapSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  skill_offering: {
    type: String,
    required: true,
    trim: true
  },
  skill_seeking: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  format: {
    type: String,
    enum: ['online', 'in_person', 'hybrid', 'flexible'],
    default: 'flexible'
  },
  time_commitment: {
    type: String,
    enum: ['1-2_hours', '3-5_hours', '5-10_hours', '10+_hours'],
    default: '1-2_hours'
  },
  matches: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    match_score: Number,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'completed'],
      default: 'pending'
    },
    matched_at: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['open', 'matched', 'in_progress', 'completed', 'closed'],
    default: 'open'
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

LearningPathSchema.index({ creator: 1, type: 1 });
LearningPathSchema.index({ skills_taught: 1 });
LearningPathSchema.index({ tags: 1 });
LearningPathSchema.index({ difficulty: 1, category: 1 });
SkillSwapSchema.index({ requester: 1, status: 1 });
SkillSwapSchema.index({ skill_offering: 1, skill_seeking: 1 });

LearningPathSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Calculate average rating
  if (this.ratings.length > 0) {
    const sum = this.ratings.reduce((acc, r) => acc + r.rating, 0);
    this.average_rating = sum / this.ratings.length;
  }
  
  next();
});

SkillSwapSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

export const LearningPath = mongoose.models.LearningPath || mongoose.model('LearningPath', LearningPathSchema);
export const SkillSwap = mongoose.models.SkillSwap || mongoose.model('SkillSwap', SkillSwapSchema);

export default {
  LearningPath,
  SkillSwap
};

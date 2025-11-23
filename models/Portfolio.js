import mongoose from 'mongoose';

const PortfolioSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
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
    enum: ['project', 'research', 'publication', 'certification', 'award', 'other'],
    default: 'project'
  },
  category: {
    type: String,
    enum: ['software', 'design', 'business', 'research', 'creative', 'other'],
    default: 'other'
  },
  thumbnail: {
    type: String,
    trim: true
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'document', 'link']
    },
    url: String,
    caption: String,
    order: Number
  }],
  demo_url: {
    type: String,
    trim: true
  },
  github_url: {
    type: String,
    trim: true
  },
  external_url: {
    type: String,
    trim: true
  },
  skills_used: [{
    type: String,
    trim: true
  }],
  technologies: [{
    type: String,
    trim: true
  }],
  role: {
    type: String,
    trim: true
  },
  team_members: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    name: String,
    role: String
  }],
  start_date: {
    type: Date
  },
  end_date: {
    type: Date
  },
  ongoing: {
    type: Boolean,
    default: false
  },
  highlights: [{
    type: String,
    trim: true
  }],
  challenges: {
    type: String,
    trim: true
  },
  learnings: {
    type: String,
    trim: true
  },
  impact: {
    type: String,
    trim: true
  },
  testimonials: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    author_name: String,
    author_title: String,
    content: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  }],
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
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    content: String,
    created_at: {
      type: Date,
      default: Date.now
    }
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

PortfolioSchema.index({ student: 1, featured: -1 });
PortfolioSchema.index({ skills_used: 1 });
PortfolioSchema.index({ tags: 1 });
PortfolioSchema.index({ created_at: -1 });
PortfolioSchema.index({ visibility: 1 });

PortfolioSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Virtual for like count
PortfolioSchema.virtual('like_count').get(function() {
  return this.likes.length;
});

// Virtual for comment count
PortfolioSchema.virtual('comment_count').get(function() {
  return this.comments.length;
});

export default mongoose.models.Portfolio || mongoose.model('Portfolio', PortfolioSchema);

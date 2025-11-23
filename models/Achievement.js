import mongoose from 'mongoose';

const AchievementSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'first_connection',
      'network_builder',
      'super_connector',
      'helpful_peer',
      'mentor',
      'skill_master',
      'content_creator',
      'engagement_champion',
      'early_adopter',
      'streak_keeper',
      'event_host',
      'collaboration_pro',
      'learning_enthusiast',
      'custom'
    ]
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: '🏆'
  },
  category: {
    type: String,
    enum: ['networking', 'learning', 'helping', 'content', 'engagement', 'special'],
    default: 'special'
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  },
  points: {
    type: Number,
    default: 10
  },
  earned_at: {
    type: Date,
    default: Date.now
  },
  progress: {
    current: {
      type: Number,
      default: 0
    },
    target: {
      type: Number,
      default: 1
    }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const LeaderboardEntrySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['overall', 'networking', 'helping', 'learning', 'content', 'weekly', 'monthly']
  },
  score: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: 0
  },
  period: {
    type: String,
    default: 'all_time'
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

const StreakSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['daily_login', 'weekly_learning', 'monthly_networking'],
    required: true
  },
  current_streak: {
    type: Number,
    default: 0
  },
  longest_streak: {
    type: Number,
    default: 0
  },
  last_activity: {
    type: Date,
    default: Date.now
  },
  started_at: {
    type: Date,
    default: Date.now
  }
});

const GamificationProfileSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true,
    index: true
  },
  total_points: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  experience: {
    type: Number,
    default: 0
  },
  next_level_experience: {
    type: Number,
    default: 100
  },
  achievements: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement'
  }],
  badges: [{
    name: String,
    icon: String,
    earned_at: Date
  }],
  streaks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Streak'
  }],
  reputation_score: {
    type: Number,
    default: 0
  },
  title: {
    type: String,
    default: 'Newcomer'
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

GamificationProfileSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Calculate level based on experience
  while (this.experience >= this.next_level_experience) {
    this.experience -= this.next_level_experience;
    this.level++;
    this.next_level_experience = Math.floor(this.next_level_experience * 1.5);
  }
  
  // Update title based on level
  if (this.level >= 50) this.title = 'Legend';
  else if (this.level >= 40) this.title = 'Master';
  else if (this.level >= 30) this.title = 'Expert';
  else if (this.level >= 20) this.title = 'Professional';
  else if (this.level >= 10) this.title = 'Contributor';
  else if (this.level >= 5) this.title = 'Active Member';
  else this.title = 'Newcomer';
  
  next();
});

AchievementSchema.index({ student: 1, type: 1 });
LeaderboardEntrySchema.index({ category: 1, score: -1 });
LeaderboardEntrySchema.index({ student: 1, category: 1 });
StreakSchema.index({ student: 1, type: 1 });

export const Achievement = mongoose.models.Achievement || mongoose.model('Achievement', AchievementSchema);
export const LeaderboardEntry = mongoose.models.LeaderboardEntry || mongoose.model('LeaderboardEntry', LeaderboardEntrySchema);
export const Streak = mongoose.models.Streak || mongoose.model('Streak', StreakSchema);
export const GamificationProfile = mongoose.models.GamificationProfile || mongoose.model('GamificationProfile', GamificationProfileSchema);

export default {
  Achievement,
  LeaderboardEntry,
  Streak,
  GamificationProfile
};

// import mongoose from 'mongoose';

// const StudentSchema = new mongoose.Schema({
//   first_name: { 
//     type: String, 
//     required: [true, 'First name is required'], 
//     trim: true 
//   },
//   last_name: { 
//     type: String, 
//     required: [true, 'Last name is required'], 
//     trim: true 
//   },
//   mail_id: { 
//     type: String,
//     // Remove required if you want email to be optional.
//     // required: [true, 'Email is required'],
//     unique: true,
//     sparse: true, // Only index documents with a non-empty email.
//     trim: true,
//     lowercase: true,
//     match: [
//       /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
//       'Please enter a valid email'
//     ]
//   },
//   phone: { 
//     type: String, 
//     required: [true, 'Phone number is required'], 
//     trim: true 
//   },
//   address: { 
//     type: String, 
//     trim: true, 
//     default: '' 
//   },
//   date_of_birth: { 
//     type: Date, 
//     default: null 
//   },
//   gender: { 
//     type: String, 
//     enum: ['male', 'female', 'other', ''], 
//     default: '' 
//   },
//   education: { 
//     type: String, 
//     enum: ['high_school', 'bachelors', 'masters', 'phd', 'other', ''], 
//     default: '' 
//   },
//   emergency_contact: { 
//     type: String, 
//     trim: true, 
//     default: '' 
//   },
//   notes: { 
//     type: String, 
//     trim: true, 
//     default: '' 
//   },
//   interests: { 
//     type: [String], 
//     default: [] 
//   },
//   created_at: { 
//     type: Date, 
//     default: Date.now 
//   },
//   updated_at: { 
//     type: Date, 
//     default: Date.now 
//   }
// });

// // Update the updated_at timestamp before saving
// StudentSchema.pre('save', function(next) {
//   this.updated_at = Date.now();
//   next();
// });

// export default mongoose.models.Student || mongoose.model('Student', StudentSchema);
import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
  first_name: { 
    type: String, 
    required: [true, 'First name is required'], 
    trim: true 
  },
  last_name: { 
    type: String, 
    required: [true, 'Last name is required'], 
    trim: true 
  },
  mail_id: { 
    type: String,
    unique: true,
    sparse: true, // Only index documents with a non-empty email.
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  phone: { 
    type: String, 
    required: [true, 'Phone number is required'], 
    trim: true 
  },
  phone_normalized: {
    type: String,
    trim: true,
    default: '',
    index: true
  },
  address: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  date_of_birth: { 
    type: Date, 
    default: null 
  },
  education: {
    type: String,
    trim: true,
    default: ''
  },
  study: {
    type: String,
    trim: true,
    default: ''
  },
  study_level: {
    type: String,
    trim: true,
    default: ''
  },
  study_institution: {
    type: String,
    trim: true,
    default: ''
  },
  study_program: {
    type: String,
    trim: true,
    default: ''
  },
  study_specialization: {
    type: String,
    trim: true,
    default: ''
  },
  graduation_completed: {
    type: Boolean,
    default: false
  },
  graduation_date: {
    type: Date,
    default: null
  },
  post_graduation_plan: {
    type: String,
    trim: true,
    default: ''
  },
  employment_status: {
    type: String,
    trim: true,
    default: ''
  },
  employment_company: {
    type: String,
    trim: true,
    default: ''
  },
  employment_role: {
    type: String,
    trim: true,
    default: ''
  },
  box_cricket: { 
    type: Boolean, 
    default: false 
  },
  box_cricket_years: { 
    type: [String],
    default: []
  },
  atmiya_cricket_tournament: { 
    type: Boolean, 
    default: false 
  },
  atmiya_cricket_years: { 
    type: [String],
    default: []
  },
  atmiya_youth_shibir: { 
    type: Boolean, 
    default: false 
  },
  atmiya_youth_years: { 
    type: [String],
    default: []
  },
  yuva_mahotsav: { 
    type: Boolean, 
    default: false 
  },
  yuva_mahotsav_years: { 
    type: [String],
    default: []
  },
  harimay: { 
    type: Boolean, 
    default: false 
  },
  portal_password_hash: {
    type: String,
    default: ''
  },
  portal_password_set_at: {
    type: Date,
    default: null
  },
  community_visibility: {
    type: String,
    enum: ['hidden', 'members'],
    default: 'members'
  },
  community_headline: {
    type: String,
    trim: true,
    default: ''
  },
  community_bio: {
    type: String,
    trim: true,
    default: ''
  },
  community_skills: {
    type: [String],
    default: []
  },
  community_interests: {
    type: [String],
    default: []
  },
  available_to_help: {
    type: Boolean,
    default: false
  },
  help_offering: {
    type: String,
    trim: true,
    maxlength: 200
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  followRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  profile_picture: {
    type: String,
    default: null
  },
  linkedin_url: {
    type: String,
    trim: true,
    default: ''
  },
  portfolio_url: {
    type: String,
    trim: true,
    default: ''
  },
  emergency_contact: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  notes: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  // --- Moved Out Fields ---
  moved_out: {
    type: Boolean,
    default: false
  },
  moved_out_date: {
    type: Date,
    default: null
  },
  moved_out_job: {
    type: String,
    trim: true,
    default: ''
  },
  moved_out_address: {
    type: String,
    trim: true,
    default: ''
  },
  moved_out_notes: {
    type: String,
    trim: true,
    default: ''
  },
  last_portal_update_at: {
    type: Date,
    default: null
  },
  last_portal_update_fields: {
    type: [String],
    default: []
  },
  last_portal_login_at: {
    type: Date,
    default: null
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

// Update the updated_at timestamp before saving
StudentSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

export default mongoose.models.Student || mongoose.model('Student', StudentSchema);



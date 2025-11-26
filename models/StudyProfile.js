import mongoose from 'mongoose';

const StudyProfileSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
});

StudyProfileSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.models.StudyProfile || mongoose.model('StudyProfile', StudyProfileSchema);

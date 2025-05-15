// models/Attendance.js
import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  assemblyDate: {
    type: String,
    required: true
  },
  attended: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index for student and assemblyDate
AttendanceSchema.index({ student: 1, assemblyDate: 1 }, { unique: true });

// Update the updatedAt field on save
AttendanceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);

// models/Attendance.js



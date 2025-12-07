import mongoose from 'mongoose';

const ResourceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['pdf', 'video'],
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  author: {
    type: String,
    default: 'Unknown',
  },
  category: {
    type: String,
    required: true,
    enum: ['it', 'data_science', 'music', 'spiritual', 'cinema', 'other'],
  },
  tags: {
    type: [String],
    default: [],
  },
  url: {
    type: String,
    required: true, // Stores YouTube URL or Base64 Data URI for PDFs
  },
  thumbnail: {
    type: String, // For videos
  },
  cover_color: {
    type: String,
    default: 'linear-gradient(135deg, #667eea, #764ba2)',
  },
  views: {
    type: Number,
    default: 0,
  },
  uploaded_by: { // Display Name
    type: String,
    required: true,
  },
  uploader_id: { // Internal ID/Email for Permissions
    type: String,
    required: true,
  },
  youtubeId: {
    type: String, // For videos
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);

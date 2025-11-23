import mongoose from 'mongoose';

const { Schema } = mongoose;

const CommentSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    content: {
      type: String,
      trim: true,
      required: true,
      maxlength: 1000
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: 'comments'
  }
);

// Pre-save hook to update timestamp
CommentSchema.pre('save', function handleTimestamp(next) {
  this.updated_at = new Date();
  next();
});

// Compound index for efficient comment queries
CommentSchema.index({ post: 1, created_at: 1 });

export default mongoose.models.Comment || mongoose.model('Comment', CommentSchema);

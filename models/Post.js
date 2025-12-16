import mongoose from 'mongoose';

const { Schema } = mongoose;

const PostSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    content: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'Student'
    }],
    shares: [{
      type: Schema.Types.ObjectId,
      ref: 'Student'
    }],
    shared_from: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      default: null
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: 'posts'
  }
);

// Virtuals for counts
PostSchema.virtual('like_count').get(function() {
  return this.likes ? this.likes.length : 0;
});

PostSchema.virtual('share_count').get(function() {
  return this.shares ? this.shares.length : 0;
});

// Pre-save hook to update timestamp
PostSchema.pre('save', function handleTimestamp(next) {
  this.updated_at = new Date();
  next();
});

// Compound index for efficient feed queries
PostSchema.index({ created_at: -1, author: 1 });

// Method to check if a user has liked the post
PostSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(id => id.toString() === userId.toString());
};

// Method to toggle like
PostSchema.methods.toggleLike = async function(userId) {
  // Ensure we're working with ObjectsIds
  const uid = new mongoose.Types.ObjectId(userId);
  
  // Use MongooseArray methods which are more robust for ObjectIds
  // Check if ID exists in array (handles ObjectId vs String comparison correctly usually, but equals is safest)
  const isLiked = this.likes.some(id => (id._id || id).toString() === uid.toString());
  
  if (isLiked) {
    this.likes.pull(uid); // Mongoose specific pull handles casting
  } else {
    this.likes.addToSet(uid); // Mongoose specific addToSet prevents duplicates
  }
  
  await this.save();
  return !isLiked; // Returns true if we just liked it
};

export default mongoose.models.Post || mongoose.model('Post', PostSchema);

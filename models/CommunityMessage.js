import mongoose from 'mongoose';

const { Schema } = mongoose;

const CommunityMessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    message: {
      type: String,
      trim: true,
      required: true,
      maxlength: 2000
    },
    read_at: {
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
  },
  {
    collection: 'communitymessages'
  }
);

CommunityMessageSchema.pre('save', function handleTimestamp(next) {
  this.updated_at = new Date();
  next();
});

CommunityMessageSchema.index({ sender: 1, recipient: 1, created_at: -1 });

export default mongoose.models.CommunityMessage ||
  mongoose.model('CommunityMessage', CommunityMessageSchema);

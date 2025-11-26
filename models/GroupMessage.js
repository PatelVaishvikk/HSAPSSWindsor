import mongoose from 'mongoose';

const { Schema } = mongoose;

const GroupMessageSchema = new Schema(
  {
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    collection: 'groupmessages'
  }
);

export default mongoose.models.GroupMessage || mongoose.model('GroupMessage', GroupMessageSchema);

import mongoose from 'mongoose';

const { Schema } = mongoose;

const GroupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200
    },
    admins: [{
      type: Schema.Types.ObjectId,
      ref: 'Student'
    }],
    members: [{
      type: Schema.Types.ObjectId,
      ref: 'Student'
    }],
    join_requests: [{
      type: Schema.Types.ObjectId,
      ref: 'Student'
    }],
    last_message_at: {
      type: Date,
      default: Date.now
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    invite_code: {
      type: String,
      unique: true,
      sparse: true
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'Student'
    },
    icon: {
      type: String,
      default: 'users'
    },
    is_public: {
      type: Boolean,
      default: true
    }
  },
  {
    collection: 'groups'
  }
);

GroupSchema.index({ name: 'text', description: 'text' });
GroupSchema.index({ members: 1 });

export default mongoose.models.Group || mongoose.model('Group', GroupSchema);

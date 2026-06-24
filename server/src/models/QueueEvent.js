import mongoose from 'mongoose';

const queueEventSchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'PATIENT_ADDED',
      'TOKEN_CALLED',
      'TOKEN_COMPLETED',
      'TOKEN_SKIPPED',
      'TOKEN_REJOINED',
      'TOKEN_CANCELLED',
      'QUEUE_PAUSED',
      'QUEUE_RESUMED',
      'ETA_RECALCULATED'
    ],
  },
  tokenNumber: {
    type: Number,
  },
  tokenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token',
  },
  message: {
    type: String,
    required: true,
  },
  visibility: {
    type: String,
    enum: ['public', 'staff'],
    default: 'public',
  },
  previousState: {
    type: Object, // Stores status, calledAt, completedAt, etc. for Undo
  },
  newState: {
    type: Object,
  },
  canUndo: {
    type: Boolean,
    default: false,
  },
  undone: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

export const QueueEvent = mongoose.model('QueueEvent', queueEventSchema);

import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true,
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QueueSession',
    required: true,
    index: true,
  },
  tokenNumber: {
    type: Number,
    required: true,
  },
  patientName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  visitType: {
    type: String,
    enum: ['general', 'followup', 'report', 'vaccination', 'emergency'],
    default: 'general',
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'skipped', 'cancelled'],
    default: 'waiting',
    index: true,
  },
  priorityLevel: {
    type: Number,
    default: 3, // 1 = Emergency, 2 = Skipped/Rejoined, 3 = Normal
  },
  priorityReason: {
    type: String,
    default: '',
  },
  calledAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  skippedAt: {
    type: Date,
  },
  cancelledAt: {
    type: Date,
  },
  rejoinedAt: {
    type: Date,
  },
  rejoinCount: {
    type: Number,
    default: 0,
  },
  durationMinutes: {
    type: Number,
  },
  estimatedServiceMinutes: {
    type: Number,
    default: 8,
  },
  estimatedWait: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Composite index for fast queue sorting
tokenSchema.index({ sessionId: 1, status: 1, priorityLevel: 1, tokenNumber: 1 });
tokenSchema.index({ clinicId: 1, sessionId: 1, tokenNumber: 1 }, { unique: true });

export const Token = mongoose.model('Token', tokenSchema);

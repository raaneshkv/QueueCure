import mongoose from 'mongoose';

const clinicSchema = new mongoose.Schema({
  clinicName: {
    type: String,
    required: true,
    trim: true,
  },
  clinicPin: {
    type: String,
    required: true,
    default: '1234', // Simple admin PIN
  },
  doctorName: {
    type: String,
    required: true,
    trim: true,
  },
  queueStatus: {
    type: String,
    enum: ['running', 'paused'],
    default: 'running',
  },
  pausedAt: {
    type: Date,
  },
  pauseReason: {
    type: String,
    default: '',
  },
  defaultConsultationTime: {
    type: Number,
    required: true,
    default: 8, // Default 8 minutes per patient
  },
  smartReturnThreshold: {
    type: Number,
    required: true,
    default: 2, // Start returning when 2 tokens ahead
  },
  queueVersion: {
    type: Number,
    default: 0,
  },
  settings: {
    allowSelfCheckIn: {
      type: Boolean,
      default: true,
    },
  },
}, {
  timestamps: true,
});

export const Clinic = mongoose.model('Clinic', clinicSchema);

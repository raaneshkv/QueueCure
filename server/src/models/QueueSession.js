import mongoose from 'mongoose';

const queueSessionSchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true,
  },
  date: {
    type: String, // format YYYY-MM-DD
    required: true,
    index: true,
  },
  tokenCounter: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['running', 'ended'],
    default: 'running',
  },
}, {
  timestamps: true,
});

// Ensure a clinic has only one session per date
queueSessionSchema.index({ clinicId: 1, date: 1 }, { unique: true });

export const QueueSession = mongoose.model('QueueSession', queueSessionSchema);

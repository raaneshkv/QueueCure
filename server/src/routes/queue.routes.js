import express from 'express';
import { QueueService } from '../services/queue.service.js';
import { Token } from '../models/Token.js';
import { Clinic } from '../models/Clinic.js';
import { validate } from '../middleware/validation.js';
import { addPatientSchema } from '../schemas/queue.schemas.js';

const router = express.Router();

// Helper to broadcast snapshot
const broadcastUpdate = async (req, clinicId) => {
  try {
    const snapshot = await QueueService.getQueueSnapshot(clinicId);
    const io = req.app.get('io');
    if (io) {
      io.to(`clinic:${clinicId}`).emit('queue_updated', snapshot);
    }
    return snapshot;
  } catch (error) {
    console.error('Error broadcasting update:', error);
  }
};

// Add patient
router.post('/:clinicId/patient', validate(addPatientSchema), async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    const { patientName, phone, visitType, priorityReason } = req.validatedBody;
    
    const { token } = await QueueService.addPatient(clinicId, {
      patientName,
      phone,
      visitType,
      priorityReason
    });

    const snapshot = await broadcastUpdate(req, clinicId);

    res.status(201).json({
      status: 'success',
      data: { token, snapshot }
    });
  } catch (error) {
    next(error);
  }
});

// Call next patient
router.post('/:clinicId/call-next', async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    
    // Check if there is an active patient already
    const snapshotBefore = await QueueService.getQueueSnapshot(clinicId);
    if (snapshotBefore.activeToken) {
      return res.status(400).json({
        status: 'error',
        message: `Token ${snapshotBefore.activeToken.tokenNumber} is still active. Mark completed or skip before calling next.`
      });
    }

    const { token } = await QueueService.callNext(clinicId);
    const snapshot = await broadcastUpdate(req, clinicId);

    res.json({
      status: 'success',
      data: { token, snapshot }
    });
  } catch (error) {
    next(error);
  }
});

// Mark completed
router.post('/:clinicId/complete-current', async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    const { token } = await QueueService.completeCurrent(clinicId);
    const snapshot = await broadcastUpdate(req, clinicId);

    res.json({
      status: 'success',
      data: { token, snapshot }
    });
  } catch (error) {
    next(error);
  }
});

// Skip token
router.post('/:clinicId/token/:tokenId/skip', async (req, res, next) => {
  try {
    const { clinicId, tokenId } = req.params;
    const { token } = await QueueService.skipToken(clinicId, tokenId);
    const snapshot = await broadcastUpdate(req, clinicId);

    res.json({
      status: 'success',
      data: { token, snapshot }
    });
  } catch (error) {
    next(error);
  }
});

// Rejoin token
router.post('/:clinicId/token/:tokenId/rejoin', async (req, res, next) => {
  try {
    const { clinicId, tokenId } = req.params;
    const { rejoinOption } = req.body; // 'next' or 'end'
    const { token } = await QueueService.rejoinToken(clinicId, tokenId, rejoinOption || 'next');
    const snapshot = await broadcastUpdate(req, clinicId);

    res.json({
      status: 'success',
      data: { token, snapshot }
    });
  } catch (error) {
    next(error);
  }
});

// Cancel token
router.post('/:clinicId/token/:tokenId/cancel', async (req, res, next) => {
  try {
    const { clinicId, tokenId } = req.params;
    const { token } = await QueueService.cancelToken(clinicId, tokenId);
    const snapshot = await broadcastUpdate(req, clinicId);

    res.json({
      status: 'success',
      data: { token, snapshot }
    });
  } catch (error) {
    next(error);
  }
});

// Pause queue
router.post('/:clinicId/pause', async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    const { reason } = req.body;
    const clinic = await QueueService.pauseQueue(clinicId, reason || 'Doctor break');
    const snapshot = await broadcastUpdate(req, clinicId);

    res.json({
      status: 'success',
      data: { clinic, snapshot }
    });
  } catch (error) {
    next(error);
  }
});

// Resume queue
router.post('/:clinicId/resume', async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    const clinic = await QueueService.resumeQueue(clinicId);
    const snapshot = await broadcastUpdate(req, clinicId);

    res.json({
      status: 'success',
      data: { clinic, snapshot }
    });
  } catch (error) {
    next(error);
  }
});

// Undo last action
router.post('/:clinicId/undo-last', async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    const { token } = await QueueService.undoLastAction(clinicId);
    const snapshot = await broadcastUpdate(req, clinicId);

    res.json({
      status: 'success',
      data: { token, snapshot }
    });
  } catch (error) {
    next(error);
  }
});

// Get snapshot (REST fallback / page load)
router.get('/:clinicId/snapshot', async (req, res, next) => {
  try {
    const snapshot = await QueueService.getQueueSnapshot(req.params.clinicId);
    res.json({
      status: 'success',
      data: snapshot
    });
  } catch (error) {
    next(error);
  }
});

// Get individual token status (Privacy-friendly)
router.get('/:clinicId/token/:tokenId', async (req, res, next) => {
  try {
    const { clinicId, tokenId } = req.params;
    const token = await Token.findById(tokenId);
    
    if (!token || token.clinicId.toString() !== clinicId) {
      return res.status(404).json({ status: 'error', message: 'Token not found' });
    }

    const clinic = await Clinic.findById(clinicId);
    const session = await QueueService.getCurrentSession(clinicId);

    // Get current active token info
    const activeToken = await Token.findOne({
      sessionId: session._id,
      status: 'active'
    });

    // Calculate position in queue (waiting tokens before this one)
    let tokensAhead = 0;
    if (token.status === 'waiting') {
      tokensAhead = await Token.countDocuments({
        sessionId: session._id,
        status: 'waiting',
        $or: [
          { priorityLevel: { $lt: token.priorityLevel } },
          { priorityLevel: token.priorityLevel, tokenNumber: { $lt: token.tokenNumber } }
        ]
      });
    }

    // Filter personal info for public presentation
    const publicTokenData = {
      _id: token._id,
      tokenNumber: token.tokenNumber,
      status: token.status,
      visitType: token.visitType,
      estimatedWait: token.estimatedWait,
      tokensAhead,
      clinicStatus: clinic.queueStatus,
      pauseReason: clinic.pauseReason,
      doctorName: clinic.doctorName,
      clinicName: clinic.clinicName,
      smartReturnThreshold: clinic.smartReturnThreshold,
      activeTokenNumber: activeToken ? activeToken.tokenNumber : null,
      createdAt: token.createdAt
    };

    res.json({
      status: 'success',
      data: publicTokenData
    });
  } catch (error) {
    next(error);
  }
});

// Get events timeline
router.get('/:clinicId/events', async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    const { role } = req.query; // 'patient' or 'staff'
    
    // Privacy protection filter logic inside getRecentEvents
    const events = await QueueService.getQueueSnapshot(clinicId).then(snapshot => snapshot.events);
    
    // For patients, filter messages or items if they contain sensitive text (our messages are anonymous by default)
    res.json({
      status: 'success',
      data: events
    });
  } catch (error) {
    next(error);
  }
});

// Get tokens filtered
router.get('/:clinicId/tokens', async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    const { status } = req.query; // 'waiting', 'active', 'completed', 'skipped', 'cancelled'
    const session = await QueueService.getCurrentSession(clinicId);

    const query = { sessionId: session._id };
    if (status) query.status = status;

    const tokens = await Token.find(query).sort({ priorityLevel: 1, tokenNumber: 1 });
    res.json({
      status: 'success',
      data: tokens
    });
  } catch (error) {
    next(error);
  }
});

// Search tokens
router.get('/:clinicId/search', async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    const { q } = req.query; // query
    if (!q) {
      return res.json({ status: 'success', data: [] });
    }

    const session = await QueueService.getCurrentSession(clinicId);
    
    const isNum = !isNaN(q);
    const queryConditions = [
      { patientName: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } }
    ];

    if (isNum) {
      queryConditions.push({ tokenNumber: Number(q) });
    }

    const tokens = await Token.find({
      sessionId: session._id,
      $or: queryConditions
    }).sort({ tokenNumber: 1 });

    res.json({
      status: 'success',
      data: tokens
    });
  } catch (error) {
    next(error);
  }
});

export default router;

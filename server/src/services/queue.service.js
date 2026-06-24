import { Clinic } from '../models/Clinic.js';
import { Token } from '../models/Token.js';
import { QueueSession } from '../models/QueueSession.js';
import { ETAService } from './eta.service.js';
import { EventService } from './event.service.js';
import { format } from 'date-fns';

export class QueueService {
  /**
   * Get or create a session for today (auto-reset).
   */
  static async getCurrentSession(clinicId) {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let session = await QueueSession.findOne({ clinicId, date: todayStr });
    if (!session) {
      try {
        session = await QueueSession.create({
          clinicId,
          date: todayStr,
          tokenCounter: 0,
          status: 'running',
        });
      } catch (err) {
        if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
          // Fetch existing session created concurrently
          session = await QueueSession.findOne({ clinicId, date: todayStr });
        } else {
          throw err;
        }
      }
    }
    return session;
  }

  /**
   * Add a new patient and assign an auto-generated token.
   */
  static async addPatient(clinicId, { patientName, phone, visitType, priorityReason }) {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) throw new Error('Clinic not found');

    const session = await this.getCurrentSession(clinicId);

    // Atomically increment token counter for this session
    const updatedSession = await QueueSession.findByIdAndUpdate(
      session._id,
      { $inc: { tokenCounter: 1 } },
      { new: true }
    );

    const tokenNumber = updatedSession.tokenCounter;
    const isEmergency = visitType === 'emergency';
    const priorityLevel = isEmergency ? 1 : 3;

    // Create the token document
    const token = await Token.create({
      clinicId,
      sessionId: session._id,
      tokenNumber,
      patientName,
      phone: phone || '',
      visitType,
      status: 'waiting',
      priorityLevel,
      priorityReason: isEmergency ? (priorityReason || 'Medical Emergency') : '',
    });

    // Increment clinic version for concurrency control
    await Clinic.findByIdAndUpdate(clinicId, { $inc: { queueVersion: 1 } });

    // Recalculate ETAs for all waiting tokens
    const etaSummary = await ETAService.recalculateAllETAs(clinicId, session._id);

    // Log the event
    await EventService.logEvent({
      clinicId,
      eventType: 'PATIENT_ADDED',
      tokenNumber,
      tokenId: token._id,
      message: isEmergency
        ? `Emergency Token ${tokenNumber} inserted into the queue`
        : `Token ${tokenNumber} joined the queue`,
      visibility: 'public',
    });

    return { token, etaSummary };
  }

  /**
   * Call the next patient in the queue.
   */
  static async callNext(clinicId) {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) throw new Error('Clinic not found');

    if (clinic.queueStatus === 'paused') {
      throw new Error('Cannot call next patient while queue is paused');
    }

    const session = await this.getCurrentSession(clinicId);

    // Check if there is already an active patient
    const activeToken = await Token.findOne({
      sessionId: session._id,
      status: 'active',
    });

    if (activeToken) {
      throw new Error(`Token ${activeToken.tokenNumber} is still active. Complete or skip first.`);
    }

    // Find the next waiting patient (sorted by priorityLevel, then tokenNumber)
    const nextToken = await Token.findOne({
      sessionId: session._id,
      status: 'waiting',
    }).sort({ priorityLevel: 1, tokenNumber: 1 });

    if (!nextToken) {
      throw new Error('No waiting patients in the queue');
    }

    // Update token status to active
    const previousState = { status: nextToken.status, calledAt: nextToken.calledAt };
    nextToken.status = 'active';
    nextToken.calledAt = new Date();
    await nextToken.save();

    await Clinic.findByIdAndUpdate(clinicId, { $inc: { queueVersion: 1 } });

    const etaSummary = await ETAService.recalculateAllETAs(clinicId, session._id);

    await EventService.logEvent({
      clinicId,
      eventType: 'TOKEN_CALLED',
      tokenNumber: nextToken.tokenNumber,
      tokenId: nextToken._id,
      message: `Token ${nextToken.tokenNumber} is called`,
      visibility: 'public',
      previousState,
      newState: { status: nextToken.status, calledAt: nextToken.calledAt },
      canUndo: true, // Calling next is undoable
    });

    return { token: nextToken, etaSummary };
  }

  /**
   * Mark the active patient's consultation as completed.
   */
  static async completeCurrent(clinicId) {
    const session = await this.getCurrentSession(clinicId);

    const activeToken = await Token.findOne({
      sessionId: session._id,
      status: 'active',
    });

    if (!activeToken) {
      throw new Error('No active patient to complete');
    }

    const now = new Date();
    const duration = Math.max(1, (now - new Date(activeToken.calledAt)) / 60000); // minimum 1 min

    activeToken.status = 'completed';
    activeToken.completedAt = now;
    activeToken.durationMinutes = Math.round(duration * 10) / 10;
    await activeToken.save();

    await Clinic.findByIdAndUpdate(clinicId, { $inc: { queueVersion: 1 } });

    const etaSummary = await ETAService.recalculateAllETAs(clinicId, session._id);

    await EventService.logEvent({
      clinicId,
      eventType: 'TOKEN_COMPLETED',
      tokenNumber: activeToken.tokenNumber,
      tokenId: activeToken._id,
      message: `Token ${activeToken.tokenNumber} consultation completed`,
      visibility: 'public',
    });

    return { token: activeToken, etaSummary };
  }

  /**
   * Skip a patient who is not present.
   */
  static async skipToken(clinicId, tokenId) {
    const token = await Token.findById(tokenId);
    if (!token) throw new Error('Token not found');
    if (token.status !== 'active' && token.status !== 'waiting') {
      throw new Error('Token cannot be skipped from current state');
    }

    const previousState = { status: token.status, skippedAt: token.skippedAt };
    token.status = 'skipped';
    token.skippedAt = new Date();
    await token.save();

    await Clinic.findByIdAndUpdate(clinicId, { $inc: { queueVersion: 1 } });

    const session = await this.getCurrentSession(clinicId);
    const etaSummary = await ETAService.recalculateAllETAs(clinicId, session._id);

    await EventService.logEvent({
      clinicId,
      eventType: 'TOKEN_SKIPPED',
      tokenNumber: token.tokenNumber,
      tokenId: token._id,
      message: `Token ${token.tokenNumber} was skipped`,
      visibility: 'public',
      previousState,
      newState: { status: token.status, skippedAt: token.skippedAt },
      canUndo: true, // Skipping is undoable
    });

    return { token, etaSummary };
  }

  /**
   * Rejoin a skipped token back into the waiting queue.
   */
  static async rejoinToken(clinicId, tokenId, rejoinOption = 'next') {
    const token = await Token.findById(tokenId);
    if (!token) throw new Error('Token not found');
    if (token.status !== 'skipped') {
      throw new Error('Only skipped tokens can rejoin');
    }

    const previousState = { status: token.status, rejoinedAt: token.rejoinedAt, priorityLevel: token.priorityLevel };

    token.status = 'waiting';
    token.rejoinedAt = new Date();
    token.rejoinCount += 1;

    // Skipped patients rejoining "next" get a higher priority level (2)
    // so they are served before normal tokens (3) but after emergency (1)
    token.priorityLevel = rejoinOption === 'next' ? 2 : 3;
    await token.save();

    await Clinic.findByIdAndUpdate(clinicId, { $inc: { queueVersion: 1 } });

    const session = await this.getCurrentSession(clinicId);
    const etaSummary = await ETAService.recalculateAllETAs(clinicId, session._id);

    await EventService.logEvent({
      clinicId,
      eventType: 'TOKEN_REJOINED',
      tokenNumber: token.tokenNumber,
      tokenId: token._id,
      message: `Token ${token.tokenNumber} rejoined the queue`,
      visibility: 'public',
    });

    return { token, etaSummary };
  }

  /**
   * Cancel a token.
   */
  static async cancelToken(clinicId, tokenId) {
    const token = await Token.findById(tokenId);
    if (!token) throw new Error('Token not found');
    if (token.status === 'completed' || token.status === 'cancelled') {
      throw new Error('Token is already finalized');
    }

    token.status = 'cancelled';
    token.cancelledAt = new Date();
    await token.save();

    await Clinic.findByIdAndUpdate(clinicId, { $inc: { queueVersion: 1 } });

    const session = await this.getCurrentSession(clinicId);
    const etaSummary = await ETAService.recalculateAllETAs(clinicId, session._id);

    await EventService.logEvent({
      clinicId,
      eventType: 'TOKEN_CANCELLED',
      tokenNumber: token.tokenNumber,
      tokenId: token._id,
      message: `Token ${token.tokenNumber} was cancelled`,
      visibility: 'public',
    });

    return { token, etaSummary };
  }

  /**
   * Pause the queue.
   */
  static async pauseQueue(clinicId, reason = 'Doctor Break') {
    const clinic = await Clinic.findByIdAndUpdate(
      clinicId,
      {
        $set: {
          queueStatus: 'paused',
          pausedAt: new Date(),
          pauseReason: reason,
        },
        $inc: { queueVersion: 1 },
      },
      { new: true }
    );

    await EventService.logEvent({
      clinicId,
      eventType: 'QUEUE_PAUSED',
      message: `Queue paused: ${reason}`,
      visibility: 'public',
    });

    return clinic;
  }

  /**
   * Resume the queue.
   */
  static async resumeQueue(clinicId) {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) throw new Error('Clinic not found');

    if (clinic.queueStatus !== 'paused') {
      return clinic;
    }

    clinic.queueStatus = 'running';
    clinic.pauseReason = '';
    clinic.pausedAt = undefined;
    await clinic.save();

    await Clinic.findByIdAndUpdate(clinicId, { $inc: { queueVersion: 1 } });

    const session = await this.getCurrentSession(clinicId);
    await ETAService.recalculateAllETAs(clinicId, session._id);

    await EventService.logEvent({
      clinicId,
      eventType: 'QUEUE_RESUMED',
      message: 'Queue resumed',
      visibility: 'public',
    });

    return clinic;
  }

  /**
   * Undo the last undoable action (skip or call next).
   */
  static async undoLastAction(clinicId) {
    const event = await EventService.getLastUndoableEvent(clinicId);
    if (!event) {
      throw new Error('No actions available to undo');
    }

    const token = await Token.findById(event.tokenId);
    if (!token) {
      throw new Error('Token for undo action not found');
    }

    // Revert token status and dates
    token.status = event.previousState.status;
    
    if (event.eventType === 'TOKEN_CALLED') {
      token.calledAt = undefined;
    } else if (event.eventType === 'TOKEN_SKIPPED') {
      token.skippedAt = undefined;
    }
    
    await token.save();

    // Mark event as undone
    event.undone = true;
    event.canUndo = false;
    await event.save();

    await Clinic.findByIdAndUpdate(clinicId, { $inc: { queueVersion: 1 } });

    const session = await this.getCurrentSession(clinicId);
    const etaSummary = await ETAService.recalculateAllETAs(clinicId, session._id);

    await EventService.logEvent({
      clinicId,
      eventType: 'ETA_RECALCULATED',
      message: `Undo action: Reverted Token ${token.tokenNumber} to ${token.status}`,
      visibility: 'staff',
    });

    return { token, etaSummary };
  }

  /**
   * Get a full snapshot of the queue state.
   */
  static async getQueueSnapshot(clinicId) {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) throw new Error('Clinic not found');

    const session = await this.getCurrentSession(clinicId);

    const activeToken = await Token.findOne({
      sessionId: session._id,
      status: 'active',
    });

    const waitingTokens = await Token.find({
      sessionId: session._id,
      status: 'waiting',
    }).sort({ priorityLevel: 1, tokenNumber: 1 });

    const completedCount = await Token.countDocuments({
      sessionId: session._id,
      status: 'completed',
    });

    const skippedCount = await Token.countDocuments({
      sessionId: session._id,
      status: 'skipped',
    });

    const totalWaiting = waitingTokens.length;

    // Compute load and ETAs
    const etaSummary = await ETAService.recalculateAllETAs(clinicId, session._id);
    const events = await EventService.getRecentEvents(clinicId, 'staff');

    return {
      clinic,
      session,
      activeToken,
      waitingTokens,
      completedCount,
      skippedCount,
      totalWaiting,
      etaSummary,
      events,
    };
  }
}

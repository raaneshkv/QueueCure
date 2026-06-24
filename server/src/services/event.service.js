import { QueueEvent } from '../models/QueueEvent.js';

export class EventService {
  /**
   * Log a queue action to the event stream.
   */
  static async logEvent({
    clinicId,
    eventType,
    tokenNumber,
    tokenId,
    message,
    visibility = 'public',
    previousState = null,
    newState = null,
    canUndo = false,
  }) {
    // If logging a new action, mark previous undoable actions as not undoable anymore (we only support 1-step undo)
    if (canUndo) {
      await QueueEvent.updateMany(
        { clinicId, canUndo: true, undone: false },
        { $set: { canUndo: false } }
      );
    }

    return await QueueEvent.create({
      clinicId,
      eventType,
      tokenNumber,
      tokenId,
      message,
      visibility,
      previousState,
      newState,
      canUndo,
      undone: false,
    });
  }

  /**
   * Fetch recent events for the clinic.
   * If role is 'patient', filter out personal details to preserve privacy.
   */
  static async getRecentEvents(clinicId, userRole = 'patient') {
    const query = { clinicId };
    if (userRole === 'patient') {
      query.visibility = 'public';
    }

    return await QueueEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(30);
  }

  /**
   * Find the last undoable action.
   */
  static async getLastUndoableEvent(clinicId) {
    return await QueueEvent.findOne({
      clinicId,
      canUndo: true,
      undone: false,
    }).sort({ createdAt: -1 });
  }
}

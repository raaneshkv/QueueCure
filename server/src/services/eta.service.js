import { Token } from '../models/Token.js';
import { Clinic } from '../models/Clinic.js';
import { differenceInMinutes } from 'date-fns';

export class ETAService {
  /**
   * Calculate moving average of the last 5 completed consultations.
   * Fallback to clinic default if fewer than 3 completed consultations exist.
   */
  static async calculateAverageConsultationTime(clinicId) {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) throw new Error('Clinic not found');

    const completedTokens = await Token.find({
      clinicId,
      status: 'completed',
      calledAt: { $ne: null },
      completedAt: { $ne: null },
    })
      .sort({ completedAt: -1 })
      .limit(5);

    if (completedTokens.length < 3) {
      return {
        average: clinic.defaultConsultationTime,
        confidence: 'Low',
        source: 'Clinic Default',
        count: completedTokens.length,
      };
    }

    const totalMinutes = completedTokens.reduce((sum, token) => {
      const duration = (token.completedAt - token.calledAt) / 60000; // in minutes
      return sum + duration;
    }, 0);

    const average = Math.round((totalMinutes / completedTokens.length) * 10) / 10;
    return {
      average,
      confidence: completedTokens.length >= 5 ? 'High' : 'Medium',
      source: 'Recent Consultation Data',
      count: completedTokens.length,
    };
  }

  /**
   * Apply visit type multipliers to get the estimated service time.
   */
  static getMultiplier(visitType) {
    const multipliers = {
      general: 1.0,
      followup: 0.75,
      report: 0.5,
      vaccination: 0.4,
      emergency: 1.0,
    };
    return multipliers[visitType] || 1.0;
  }

  /**
   * Recalculate estimated wait times for all waiting tokens in a session.
   */
  static async recalculateAllETAs(clinicId, sessionId) {
    const avgData = await this.calculateAverageConsultationTime(clinicId);
    const avgTime = avgData.average;

    // Get currently active token (if any)
    const activeToken = await Token.findOne({
      sessionId,
      status: 'active',
    });

    let activeRemainingTime = 0;
    let delayDetected = false;
    let extraDelayMinutes = 0;

    if (activeToken && activeToken.calledAt) {
      const elapsedMinutes = (new Date() - new Date(activeToken.calledAt)) / 60000;
      const expectedTime = avgTime * this.getMultiplier(activeToken.visitType);

      if (elapsedMinutes > expectedTime * 1.5) {
        delayDetected = true;
        extraDelayMinutes = Math.round(elapsedMinutes - expectedTime);
      }
      activeRemainingTime = Math.max(0, expectedTime - elapsedMinutes) + extraDelayMinutes;
    }

    // Get all waiting tokens sorted by priority and token number
    const waitingTokens = await Token.find({
      sessionId,
      status: 'waiting',
    }).sort({ priorityLevel: 1, tokenNumber: 1 });

    let cumulativeWait = activeRemainingTime;

    // Save ETAs back to DB
    const updates = waitingTokens.map(async (token) => {
      const estimatedService = avgTime * this.getMultiplier(token.visitType);
      token.estimatedServiceMinutes = Math.round(estimatedService * 10) / 10;
      token.estimatedWait = Math.round(cumulativeWait);
      
      // Update cumulative wait for the next token
      cumulativeWait += estimatedService;
      
      await token.save();
      return token;
    });

    await Promise.all(updates);

    const totalQueueMinutes = cumulativeWait;
    let loadLevel = 'LIGHT';
    if (totalQueueMinutes >= 120) loadLevel = 'OVERCROWDED';
    else if (totalQueueMinutes >= 60) loadLevel = 'HEAVY';
    else if (totalQueueMinutes >= 30) loadLevel = 'MODERATE';

    return {
      averageConsultationTime: avgTime,
      etaConfidence: avgData.confidence,
      etaSource: avgData.source,
      completedCount: avgData.count,
      loadLevel,
      totalQueueMinutes: Math.round(totalQueueMinutes),
      delayDetected,
      extraDelayMinutes,
    };
  }
}

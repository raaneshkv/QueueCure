import { Token } from '../models/Token.js';
import { QueueSession } from '../models/QueueSession.js';
import mongoose from 'mongoose';
import { startOfDay, endOfDay } from 'date-fns';

export class AnalyticsService {
  /**
   * Get the daily summary statistics for a clinic.
   */
  static async getDailySummary(clinicId) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Get today's sessions
    const sessions = await QueueSession.find({
      clinicId,
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });

    const sessionIds = sessions.map(s => s._id);

    if (sessionIds.length === 0) {
      return {
        completedToday: 0,
        currentlyWaiting: 0,
        skippedToday: 0,
        averageConsultationTime: 0,
        averageWaitTime: 0,
        totalQueueMinutes: 0
      };
    }

    const completedToday = await Token.countDocuments({
      sessionId: { $in: sessionIds },
      status: 'completed'
    });

    const currentlyWaiting = await Token.countDocuments({
      sessionId: { $in: sessionIds },
      status: 'waiting'
    });

    const skippedToday = await Token.countDocuments({
      sessionId: { $in: sessionIds },
      status: 'skipped'
    });

    // Average consultation time today
    const avgConsultationResult = await Token.aggregate([
      {
        $match: {
          sessionId: { $in: sessionIds },
          status: 'completed',
          durationMinutes: { $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$durationMinutes" }
        }
      }
    ]);

    const averageConsultationTime = avgConsultationResult.length > 0
      ? Math.round(avgConsultationResult[0].avgDuration * 10) / 10
      : 0;

    // Average patient wait time today (time from createdAt to calledAt in minutes)
    const avgWaitResult = await Token.aggregate([
      {
        $match: {
          sessionId: { $in: sessionIds },
          status: { $in: ['active', 'completed'] },
          calledAt: { $ne: null }
        }
      },
      {
        $project: {
          waitDurationMinutes: {
            $divide: [{ $subtract: ["$calledAt", "$createdAt"] }, 60000]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgWait: { $avg: "$waitDurationMinutes" }
        }
      }
    ]);

    const averageWaitTime = avgWaitResult.length > 0
      ? Math.round(avgWaitResult[0].avgWait)
      : 0;

    return {
      completedToday,
      currentlyWaiting,
      skippedToday,
      averageConsultationTime,
      averageWaitTime
    };
  }

  /**
   * Get patients served per hour today (for bar charts).
   */
  static async getPatientsPerHour(clinicId) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const result = await Token.aggregate([
      {
        $match: {
          clinicId: new mongoose.Types.ObjectId(clinicId),
          status: 'completed',
          completedAt: { $gte: todayStart, $lte: todayEnd }
        }
      },
      {
        $project: {
          hour: { $hour: { date: "$completedAt", timezone: "Asia/Kolkata" } }
        }
      },
      {
        $group: {
          _id: "$hour",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Format for charting
    const formatted = Array.from({ length: 24 }, (_, i) => {
      const ampm = i >= 12 ? 'PM' : 'AM';
      const displayHour = i % 12 === 0 ? 12 : i % 12;
      const label = `${displayHour} ${ampm}`;
      
      const hourData = result.find(r => r._id === i);
      return {
        hour: label,
        patients: hourData ? hourData.count : 0
      };
    });

    // Return only active hours of typical clinic operations (e.g. 8 AM to 9 PM)
    return formatted.filter((_, idx) => idx >= 8 && idx <= 21);
  }

  /**
   * Get visit type distribution.
   */
  static async getVisitTypeDistribution(clinicId) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const result = await Token.aggregate([
      {
        $match: {
          clinicId: new mongoose.Types.ObjectId(clinicId),
          createdAt: { $gte: todayStart, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: "$visitType",
          value: { $sum: 1 }
        }
      }
    ]);

    const nameMappings = {
      general: 'General Consultation',
      followup: 'Follow-up',
      report: 'Report Review',
      vaccination: 'Vaccination',
      emergency: 'Emergency Priority'
    };

    return result.map(r => ({
      name: nameMappings[r._id] || r._id,
      value: r.value
    }));
  }

  /**
   * Get consultation duration trend (moving durations of the last 15 patients).
   */
  static async getConsultationTimeTrend(clinicId) {
    const tokens = await Token.find({
      clinicId,
      status: 'completed',
      durationMinutes: { $ne: null }
    })
      .sort({ completedAt: -1 })
      .limit(15);

    // Return chronological order
    return tokens.reverse().map(t => ({
      tokenNumber: `Token ${t.tokenNumber}`,
      duration: t.durationMinutes
    }));
  }

  /**
   * Get doctor performance metrics.
   */
  static async getDoctorPerformance(clinicId) {
    const result = await Token.aggregate([
      {
        $match: {
          clinicId: new mongoose.Types.ObjectId(clinicId),
          status: 'completed',
          durationMinutes: { $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$durationMinutes" },
          maxDuration: { $max: "$durationMinutes" },
          minDuration: { $min: "$durationMinutes" }
        }
      }
    ]);

    if (result.length === 0) {
      return {
        averageConsultationTime: 0,
        longestConsultation: 0,
        fastestConsultation: 0
      };
    }

    return {
      averageConsultationTime: Math.round(result[0].avgDuration * 10) / 10,
      longestConsultation: Math.round(result[0].maxDuration * 10) / 10,
      fastestConsultation: Math.round(result[0].minDuration * 10) / 10
    };
  }
}

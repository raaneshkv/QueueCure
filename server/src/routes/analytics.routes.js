import express from 'express';
import { AnalyticsService } from '../services/analytics.service.js';

const router = express.Router();

// Daily summary stats
router.get('/:clinicId/daily', async (req, res, next) => {
  try {
    const data = await AnalyticsService.getDailySummary(req.params.clinicId);
    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
});

// Patients served per hour (bar chart data)
router.get('/:clinicId/hourly', async (req, res, next) => {
  try {
    const data = await AnalyticsService.getPatientsPerHour(req.params.clinicId);
    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
});

// Visit types breakdown (pie chart data)
router.get('/:clinicId/visit-types', async (req, res, next) => {
  try {
    const data = await AnalyticsService.getVisitTypeDistribution(req.params.clinicId);
    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
});

// Consultation time trend (line chart data)
router.get('/:clinicId/consultation-trend', async (req, res, next) => {
  try {
    const data = await AnalyticsService.getConsultationTimeTrend(req.params.clinicId);
    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
});

// Doctor performance insights
router.get('/:clinicId/doctor-performance', async (req, res, next) => {
  try {
    const data = await AnalyticsService.getDoctorPerformance(req.params.clinicId);
    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
});

export default router;

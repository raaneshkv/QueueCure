import express from 'express';
import { Clinic } from '../models/Clinic.js';
import { validate } from '../middleware/validation.js';
import {
  createClinicSchema,
  updateSettingsSchema,
  verifyPinSchema
} from '../schemas/queue.schemas.js';

const router = express.Router();

// Create clinic
router.post('/', validate(createClinicSchema), async (req, res, next) => {
  try {
    const { clinicName, doctorName, clinicPin } = req.validatedBody;
    const newClinic = await Clinic.create({
      clinicName,
      doctorName,
      clinicPin,
    });
    
    res.status(201).json({
      status: 'success',
      data: newClinic,
    });
  } catch (error) {
    next(error);
  }
});

// Lookup clinic by name (must be before /:clinicId to avoid param conflict)
router.get('/lookup', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ status: 'success', data: [] });
    }
    const clinics = await Clinic.find({
      clinicName: { $regex: q.trim(), $options: 'i' }
    }).select('-clinicPin').limit(10);

    res.json({ status: 'success', data: clinics });
  } catch (error) {
    next(error);
  }
});

// Get clinic info
router.get('/:clinicId', async (req, res, next) => {
  try {
    const clinic = await Clinic.findById(req.params.clinicId);
    if (!clinic) {
      return res.status(404).json({ status: 'error', message: 'Clinic not found' });
    }
    
    // Privacy-focused: exclude PIN from default clinic info queries
    const clinicData = clinic.toObject();
    delete clinicData.clinicPin;

    res.json({
      status: 'success',
      data: clinicData,
    });
  } catch (error) {
    next(error);
  }
});

// Update clinic settings
router.put('/:clinicId/settings', validate(updateSettingsSchema), async (req, res, next) => {
  try {
    const clinic = await Clinic.findByIdAndUpdate(
      req.params.clinicId,
      { $set: req.validatedBody, $inc: { queueVersion: 1 } },
      { new: true }
    );
    if (!clinic) {
      return res.status(404).json({ status: 'error', message: 'Clinic not found' });
    }
    
    const clinicData = clinic.toObject();
    delete clinicData.clinicPin;

    res.json({
      status: 'success',
      data: clinicData,
    });
  } catch (error) {
    next(error);
  }
});

// Verify clinic admin PIN
router.post('/:clinicId/verify-pin', validate(verifyPinSchema), async (req, res, next) => {
  try {
    const { clinicPin } = req.validatedBody;
    const clinic = await Clinic.findById(req.params.clinicId);
    
    if (!clinic) {
      return res.status(404).json({ status: 'error', message: 'Clinic not found' });
    }

    const isValid = clinic.clinicPin === clinicPin;
    res.json({
      status: 'success',
      isValid,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

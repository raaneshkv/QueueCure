import { z } from 'zod';

export const createClinicSchema = z.object({
  clinicName: z.string().min(2, 'Clinic name must be at least 2 characters').max(50),
  doctorName: z.string().min(2, 'Doctor name must be at least 2 characters').max(50),
  clinicPin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'PIN must contain only numbers'),
});

export const addPatientSchema = z.object({
  patientName: z.string().min(2, 'Patient name must be at least 2 characters').max(50),
  phone: z.string().optional().or(z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits').or(z.literal(''))),
  visitType: z.enum(['general', 'followup', 'report', 'vaccination', 'emergency']),
  priorityReason: z.string().optional(),
}).refine(data => {
  if (data.visitType === 'emergency') {
    return !!data.priorityReason && data.priorityReason.trim().length > 0;
  }
  return true;
}, {
  message: "Priority reason is required for emergency visits",
  path: ["priorityReason"]
});

export const updateSettingsSchema = z.object({
  clinicName: z.string().min(2, 'Clinic name must be at least 2 characters').optional(),
  doctorName: z.string().min(2, 'Doctor name must be at least 2 characters').optional(),
  defaultConsultationTime: z.number().min(1, 'Default consultation time must be at least 1 minute').max(60).optional(),
  smartReturnThreshold: z.number().min(1, 'SmartReturn threshold must be at least 1 token').max(10).optional(),
});

export const verifyPinSchema = z.object({
  clinicPin: z.string().length(4, 'PIN must be exactly 4 digits'),
});

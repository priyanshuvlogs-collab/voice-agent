import { z } from "zod";

export const checkAvailabilitySchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  timezone: z.string().optional(),
  calendarId: z.string().optional(),
});

export const createContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  phone: z.string().min(7),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional(),
});

export const bookAppointmentSchema = z.object({
  contactId: z.string().min(1).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  startTime: z.string().min(1),
  endTime: z.string().optional(),
  timezone: z.string().optional(),
  calendarId: z.string().optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
});

export const findContactSchema = z.object({
  phone: z.string().min(7),
});

export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;
export type FindContactInput = z.infer<typeof findContactSchema>;

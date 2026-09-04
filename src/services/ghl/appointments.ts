import { env } from "../../config/env.js";
import type { AppointmentPayload, AppointmentRecord } from "../../types/domain.js";
import { ghlRequest } from "./client.js";

interface GhlAppointmentDto {
  id: string;
  contactId?: string;
  calendarId?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  appointment?: {
    id: string;
    contactId?: string;
    calendarId?: string;
    startTime?: string;
    endTime?: string;
    status?: string;
  };
}

function resolveEndTime(startTime: string, endTime?: string): string {
  if (endTime) return endTime;
  const start = new Date(startTime);
  return new Date(
    start.getTime() + env.APPOINTMENT_DURATION_MINUTES * 60_000,
  ).toISOString();
}

export async function createAppointment(
  payload: AppointmentPayload,
): Promise<AppointmentRecord> {
  const calendarId = payload.calendarId || env.GHL_CALENDAR_ID;
  const timezone = payload.timezone || env.DEFAULT_TIMEZONE;
  const endTime = resolveEndTime(payload.startTime, payload.endTime);

  const body = {
    calendarId,
    locationId: env.GHL_LOCATION_ID,
    contactId: payload.contactId,
    startTime: payload.startTime,
    endTime,
    title: payload.title || `${env.BUSINESS_NAME} Appointment`,
    appointmentStatus: "confirmed",
    address: "online",
    meetingLocationType: "custom",
    toNotify: true,
    ignoreDateRange: false,
    ignoreFreeSlotValidation: false,
    notes: payload.notes,
    timezone,
  };

  const result = await ghlRequest<GhlAppointmentDto>({
    method: "POST",
    path: "/calendars/events/appointments",
    body,
  });

  const dto = result.appointment ?? result;

  return {
    id: dto.id,
    contactId: dto.contactId || payload.contactId,
    calendarId: dto.calendarId || calendarId,
    startTime: dto.startTime || payload.startTime,
    endTime: dto.endTime || endTime,
    status: dto.status || "confirmed",
  };
}

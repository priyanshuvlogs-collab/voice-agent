import { env } from "../../config/env.js";
import type { AvailabilitySlot } from "../../types/domain.js";
import { ghlRequest } from "./client.js";

interface GhlFreeSlotDto {
  slots?: string[] | Record<string, string[]>;
  // Some GHL responses nest by date → array of start times
  [date: string]: unknown;
}

function toEndTime(startIso: string, durationMinutes: number): string {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return end.toISOString();
}

function flattenSlots(payload: GhlFreeSlotDto, durationMinutes: number): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];

  if (Array.isArray(payload.slots)) {
    for (const start of payload.slots) {
      slots.push({ startTime: start, endTime: toEndTime(start, durationMinutes) });
    }
    return slots;
  }

  if (payload.slots && typeof payload.slots === "object") {
    for (const times of Object.values(payload.slots)) {
      if (!Array.isArray(times)) continue;
      for (const start of times) {
        slots.push({ startTime: start, endTime: toEndTime(start, durationMinutes) });
      }
    }
    return slots;
  }

  // Fallback: date-keyed maps of ISO strings
  for (const [key, value] of Object.entries(payload)) {
    if (key === "slots" || !Array.isArray(value)) continue;
    for (const start of value) {
      if (typeof start === "string") {
        slots.push({ startTime: start, endTime: toEndTime(start, durationMinutes) });
      }
    }
  }

  return slots;
}

export async function getAvailableSlots(input: {
  startDate: string;
  endDate: string;
  timezone?: string;
  calendarId?: string;
}): Promise<AvailabilitySlot[]> {
  const calendarId = input.calendarId || env.GHL_CALENDAR_ID;
  const timezone = input.timezone || env.DEFAULT_TIMEZONE;

  const result = await ghlRequest<GhlFreeSlotDto>({
    method: "GET",
    path: `/calendars/${calendarId}/free-slots`,
    query: {
      startDate: input.startDate,
      endDate: input.endDate,
      timezone,
    },
  });

  return flattenSlots(result, env.APPOINTMENT_DURATION_MINUTES);
}

import type { Env } from "../config/env";
import type { GhlClient } from "../clients/ghl.client";
import type { GhlAppointment, GhlContact, GhlFreeSlotsResponse, NormalizedSlot } from "../types/ghl";
import { ValidationError } from "../utils/errors";
import { normalizePhone } from "../utils/phone";
import {
  addMinutes,
  clampRangeToMaxDays,
  defaultAvailabilityWindow,
  formatSlotLabel,
  parseDateInput,
  resolveTimeZone,
  toEpochMs,
} from "../utils/time";

export interface AvailabilityQuery {
  startDate?: string;
  endDate?: string;
  timeZone?: string;
  calendarId?: string;
  limit?: number;
}

export interface ContactInput {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
}

export interface BookAppointmentInput {
  startTime: string;
  endTime?: string;
  contactId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  calendarId?: string;
  timeZone?: string;
}

export class GhlService {
  constructor(
    private readonly env: Env,
    private readonly client: GhlClient,
  ) {}

  async checkAvailability(query: AvailabilityQuery): Promise<{ slots: NormalizedSlot[]; timeZone: string; calendarId: string }> {
    const timeZone = resolveTimeZone(query.timeZone, this.env.GHL_TIMEZONE);
    const calendarId = query.calendarId || this.requireCalendarId();
    const window = this.resolveWindow(query, timeZone);
    const raw = await this.client.getFreeSlots({
      calendarId,
      startDateMs: toEpochMs(window.start),
      endDateMs: toEpochMs(window.end),
      timeZone,
    });
    const slots = normalizeFreeSlots(raw, timeZone, query.limit ?? 5);
    return { slots, timeZone, calendarId };
  }

  async getContact(input: { contactId?: string; phone?: string; email?: string }): Promise<GhlContact | undefined> {
    if (input.contactId) {
      const result = await this.client.getContact(input.contactId);
      return result.contact;
    }

    const phone = normalizePhone(input.phone);
    const email = input.email?.trim();
    if (!phone && !email) {
      throw new ValidationError("A contactId, phone, or email is required to look up a contact.");
    }

    const result = await this.client.searchContacts({ phone, email });
    return result.contacts[0];
  }

  async createContact(input: ContactInput): Promise<{ contact: GhlContact; created: boolean }> {
    const phone = normalizePhone(input.phone);
    const email = input.email?.trim();
    if (!phone && !email) {
      throw new ValidationError("A phone number or email is required to create a contact.");
    }
    if (!this.env.GHL_LOCATION_ID) {
      throw new ValidationError("GHL_LOCATION_ID is not configured.");
    }

    const { firstName, lastName } = splitName(input);
    const result = await this.client.upsertContact({
      locationId: this.env.GHL_LOCATION_ID,
      firstName,
      lastName,
      name: input.name,
      email,
      phone,
      source: this.env.GHL_CONTACT_SOURCE,
      tags: uniqueTags([...(this.env.GHL_CONTACT_TAGS ?? []), ...(input.tags ?? [])]),
      timezone: this.env.GHL_TIMEZONE,
    });

    return { contact: result.contact, created: Boolean(result.new) };
  }

  async bookAppointment(input: BookAppointmentInput): Promise<{ appointment: GhlAppointment; contact: GhlContact }> {
    if (!input.startTime) {
      throw new ValidationError("startTime is required to book an appointment.");
    }
    if (!this.env.GHL_LOCATION_ID) {
      throw new ValidationError("GHL_LOCATION_ID is not configured.");
    }

    let contact: GhlContact | undefined;
    if (input.contactId) {
      contact = await this.getContact({ contactId: input.contactId });
    }
    if (!contact) {
      const upserted = await this.createContact(input);
      contact = upserted.contact;
    }
    if (!contact?.id) {
      throw new ValidationError("Unable to resolve a GoHighLevel contact for this booking.");
    }

    const timeZone = resolveTimeZone(input.timeZone, this.env.GHL_TIMEZONE);
    const endTime =
      input.endTime || addMinutes(input.startTime, this.env.GHL_APPOINTMENT_DURATION_MINUTES, timeZone);

    const appointment = await this.client.createAppointment({
      calendarId: input.calendarId || this.requireCalendarId(),
      locationId: this.env.GHL_LOCATION_ID,
      contactId: contact.id,
      startTime: input.startTime,
      endTime,
      title: input.title || "Appointment",
      appointmentStatus: "confirmed",
      toNotify: true,
    });

    return { appointment, contact };
  }

  private resolveWindow(query: AvailabilityQuery, timeZone: string) {
    if (!query.startDate && !query.endDate) {
      return defaultAvailabilityWindow(timeZone, 7);
    }
    const start = parseDateInput(query.startDate, timeZone, 0);
    const end = query.endDate ? parseDateInput(query.endDate, timeZone, 0).endOf("day") : start.plus({ days: 7 }).endOf("day");
    return clampRangeToMaxDays(start, end, 31);
  }

  private requireCalendarId(): string {
    if (!this.env.GHL_CALENDAR_ID) {
      throw new ValidationError("GHL_CALENDAR_ID is not configured.");
    }
    return this.env.GHL_CALENDAR_ID;
  }
}

export function normalizeFreeSlots(raw: GhlFreeSlotsResponse, timeZone: string, limit: number): NormalizedSlot[] {
  const slots: NormalizedSlot[] = [];

  for (const [date, value] of Object.entries(raw)) {
    if (date === "traceId" || !value || typeof value === "string") {
      continue;
    }
    for (const startTime of value.slots ?? []) {
      slots.push({
        startTime,
        date,
        label: formatSlotLabel(startTime, timeZone),
      });
      if (slots.length >= limit) {
        return slots;
      }
    }
  }

  return slots;
}

function splitName(input: ContactInput): { firstName?: string; lastName?: string } {
  if (input.firstName || input.lastName) {
    return { firstName: input.firstName, lastName: input.lastName };
  }
  const name = input.name?.trim();
  if (!name) {
    return {};
  }
  const [firstName, ...rest] = name.split(/\s+/);
  return { firstName, lastName: rest.join(" ") || undefined };
}

function uniqueTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}


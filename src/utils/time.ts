import { DateTime } from "luxon";

const RELATIVE_DAYS: Record<string, number> = {
  today: 0,
  tonight: 0,
  tomorrow: 1,
};

export function resolveTimeZone(timeZone?: string, fallback = "America/New_York"): string {
  const candidate = timeZone?.trim() || fallback;
  return DateTime.now().setZone(candidate).isValid ? candidate : fallback;
}

export function parseDateInput(value: string | undefined, timeZone: string, fallbackOffsetDays = 0): DateTime {
  const zone = resolveTimeZone(timeZone);
  const now = DateTime.now().setZone(zone);

  if (!value || !value.trim()) {
    return now.plus({ days: fallbackOffsetDays }).startOf("day");
  }

  const normalized = value.trim().toLowerCase();
  if (normalized in RELATIVE_DAYS) {
    return now.plus({ days: RELATIVE_DAYS[normalized] }).startOf("day");
  }

  const iso = DateTime.fromISO(value.trim(), { zone });
  if (iso.isValid) {
    return iso;
  }

  const friendly = DateTime.fromFormat(value.trim(), "MMMM d, yyyy", { zone });
  if (friendly.isValid) {
    return friendly.startOf("day");
  }

  const numeric = DateTime.fromFormat(value.trim(), "yyyy-MM-dd", { zone });
  if (numeric.isValid) {
    return numeric.startOf("day");
  }

  throw new Error(`Could not understand date "${value}". Use YYYY-MM-DD, an ISO timestamp, today, or tomorrow.`);
}

export function toEpochMs(dateTime: DateTime): number {
  return dateTime.toMillis();
}

export function addMinutes(isoOrDateTime: string | DateTime, minutes: number, timeZone: string): string {
  const zone = resolveTimeZone(timeZone);
  const start = typeof isoOrDateTime === "string" ? DateTime.fromISO(isoOrDateTime, { zone }) : isoOrDateTime.setZone(zone);
  if (!start.isValid) {
    throw new Error("Invalid start time");
  }
  return start.plus({ minutes }).toISO() ?? start.plus({ minutes }).toUTC().toISO()!;
}

export function formatSlotLabel(iso: string, timeZone: string): string {
  const zone = resolveTimeZone(timeZone);
  const dt = DateTime.fromISO(iso, { setZone: true }).setZone(zone);
  if (!dt.isValid) {
    return iso;
  }
  return dt.toFormat("cccc, LLLL d 'at' h:mm a");
}

export function clampRangeToMaxDays(start: DateTime, end: DateTime, maxDays = 31): { start: DateTime; end: DateTime } {
  if (end < start) {
    return { start, end: start.endOf("day") };
  }
  const maxEnd = start.plus({ days: maxDays - 1 }).endOf("day");
  return { start, end: end > maxEnd ? maxEnd : end };
}

export function defaultAvailabilityWindow(timeZone: string, days = 7): { start: DateTime; end: DateTime } {
  const zone = resolveTimeZone(timeZone);
  const start = DateTime.now().setZone(zone);
  const end = start.plus({ days }).endOf("day");
  return { start, end };
}

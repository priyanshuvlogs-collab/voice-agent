import { formatSlotLabel } from "../utils/time";
import { asNumber, asString, type ToolDefinition } from "./types";

export const checkAvailabilityTool: ToolDefinition = {
  name: "check_availability",
  aliases: ["checkAvailability", "checkGHLAvailability", "check_ghl_availability"],
  description: "Check GoHighLevel calendar availability and return the next open slots.",
  async execute(args, context) {
    const result = await context.ghl.checkAvailability({
      startDate: asString(args.startDate) ?? asString(args.start) ?? asString(args.date),
      endDate: asString(args.endDate) ?? asString(args.end),
      timeZone: asString(args.timeZone) ?? asString(args.timezone),
      calendarId: asString(args.calendarId),
      limit: asNumber(args.limit) ?? 5,
    });

    if (result.slots.length === 0) {
      return {
        ok: true,
        spoken:
          "There are no open appointment times in that range. Ask the caller if another day or later this week would work.",
        slots: [],
        timeZone: result.timeZone,
        calendarId: result.calendarId,
      };
    }

    const spoken = `I have ${result.slots.length} opening${result.slots.length === 1 ? "" : "s"}: ${result.slots
      .map((slot) => slot.label)
      .join("; ")}. Offer these times to the caller and then book the one they choose.`;

    return {
      ok: true,
      spoken,
      slots: result.slots.map((slot) => ({
        ...slot,
        spoken: formatSlotLabel(slot.startTime, result.timeZone),
      })),
      timeZone: result.timeZone,
      calendarId: result.calendarId,
    };
  },
};

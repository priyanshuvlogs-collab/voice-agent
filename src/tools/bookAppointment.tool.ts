import { formatSlotLabel } from "../utils/time";
import { asString, type ToolDefinition } from "./types";

export const bookAppointmentTool: ToolDefinition = {
  name: "book_appointment",
  aliases: ["bookAppointment", "create_event", "ghl_create_event", "createAppointment", "schedule_appointment"],
  description: "Book a confirmed appointment on the GoHighLevel calendar.",
  async execute(args, context) {
    const startTime = asString(args.startTime) ?? asString(args.slotStartTime) ?? asString(args.start);
    const timeZone = asString(args.timeZone) ?? asString(args.timezone) ?? context.env.GHL_TIMEZONE;
    const sessionContactId = context.call?.id ? context.sessions.getByVapiCallId(context.call.id)?.contactId : undefined;

    const { appointment, contact } = await context.ghl.bookAppointment({
      startTime: startTime ?? "",
      endTime: asString(args.endTime) ?? asString(args.end),
      contactId: asString(args.contactId) ?? sessionContactId,
      firstName: asString(args.firstName),
      lastName: asString(args.lastName),
      name: asString(args.name) ?? asString(args.fullName),
      email: asString(args.email),
      phone: asString(args.phone) ?? context.callerNumber,
      title: asString(args.title),
      calendarId: asString(args.calendarId),
      timeZone,
    });

    context.sessions.attachContact(context.call?.id, contact.id, context.callerNumber);
    const when = appointment.startTime ? formatSlotLabel(appointment.startTime, timeZone) : "the requested time";
    return {
      ok: true,
      spoken: `You're booked for ${when}. Confirmation is on file for ${contact.firstName ?? contact.name ?? "the caller"}.`,
      appointment,
      contact,
    };
  },
};

import { env } from "../../config/env.js";
import type { ToolResult } from "../../types/domain.js";
import {
  bookAppointmentSchema,
  checkAvailabilitySchema,
  createContactSchema,
  findContactSchema,
  type BookAppointmentInput,
  type CheckAvailabilityInput,
  type CreateContactInput,
  type FindContactInput,
} from "../../types/tools.js";
import { ValidationError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import {
  createAppointment,
  createContact,
  ensureContact,
  findContactByPhone,
  getAvailableSlots,
} from "../ghl/index.js";

export type ToolName =
  | "check_availability"
  | "create_contact"
  | "book_appointment"
  | "find_contact";

export interface ToolCallRequest {
  name: ToolName | string;
  arguments: Record<string, unknown>;
  call?: {
    customer?: { number?: string; name?: string };
  };
}

function parseOrThrow<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown,
  label: string,
): T {
  try {
    return schema.parse(data);
  } catch (err) {
    throw new ValidationError(`Invalid arguments for ${label}`, err);
  }
}

export async function checkAvailabilityTool(
  input: CheckAvailabilityInput,
): Promise<ToolResult<{ slots: Awaited<ReturnType<typeof getAvailableSlots>>; timezone: string }>> {
  const slots = await getAvailableSlots(input);
  const limited = slots.slice(0, 8);
  return {
    ok: true,
    message:
      limited.length > 0
        ? `Found ${limited.length} open slot(s).`
        : "No open slots in that range.",
    data: {
      slots: limited,
      timezone: input.timezone || env.DEFAULT_TIMEZONE,
    },
  };
}

export async function createContactTool(
  input: CreateContactInput,
): Promise<ToolResult<{ contact: Awaited<ReturnType<typeof createContact>> }>> {
  const contact = await ensureContact({
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    email: input.email,
    tags: input.tags,
  });
  return {
    ok: true,
    message: `Contact ready (${contact.id}).`,
    data: { contact },
  };
}

export async function findContactTool(
  input: FindContactInput,
): Promise<ToolResult<{ contact: Awaited<ReturnType<typeof findContactByPhone>> }>> {
  const contact = await findContactByPhone(input.phone);
  return {
    ok: true,
    message: contact ? `Found contact ${contact.id}.` : "No contact found for that phone.",
    data: { contact },
  };
}

export async function bookAppointmentTool(
  input: BookAppointmentInput,
  fallbackPhone?: string,
): Promise<
  ToolResult<{
    appointment: Awaited<ReturnType<typeof createAppointment>>;
    contactId: string;
  }>
> {
  let contactId = input.contactId;

  if (!contactId) {
    const phone = input.phone || fallbackPhone;
    if (!phone || !input.firstName) {
      throw new ValidationError(
        "book_appointment requires contactId, or firstName + phone to create/find a contact",
      );
    }
    const contact = await ensureContact({
      firstName: input.firstName,
      lastName: input.lastName,
      phone,
      email: input.email,
    });
    contactId = contact.id;
  }

  const appointment = await createAppointment({
    contactId,
    calendarId: input.calendarId,
    startTime: input.startTime,
    endTime: input.endTime,
    title: input.title,
    notes: input.notes,
    timezone: input.timezone,
  });

  return {
    ok: true,
    message: `Appointment booked for ${appointment.startTime}.`,
    data: { appointment, contactId },
  };
}

/**
 * Dispatch a Vapi function/tool call to the matching GHL-backed handler.
 */
export async function executeToolCall(request: ToolCallRequest): Promise<ToolResult> {
  const name = request.name;
  const args = request.arguments ?? {};
  const callerPhone = request.call?.customer?.number;

  logger.info({ tool: name, args }, "Executing tool call");

  switch (name) {
    case "check_availability": {
      const input = parseOrThrow(checkAvailabilitySchema, args, name);
      return checkAvailabilityTool(input);
    }
    case "create_contact": {
      const withPhone = {
        ...args,
        phone: (args.phone as string | undefined) || callerPhone,
      };
      const input = parseOrThrow(createContactSchema, withPhone, name);
      return createContactTool(input);
    }
    case "find_contact": {
      const withPhone = {
        ...args,
        phone: (args.phone as string | undefined) || callerPhone,
      };
      const input = parseOrThrow(findContactSchema, withPhone, name);
      return findContactTool(input);
    }
    case "book_appointment": {
      const input = parseOrThrow(bookAppointmentSchema, args, name);
      return bookAppointmentTool(input, callerPhone);
    }
    default:
      return {
        ok: false,
        error: `Unknown tool: ${name}`,
      };
  }
}

/** Tool definitions to paste into the Vapi assistant configuration. */
export const vapiToolDefinitions = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "Check open appointment slots on the business calendar between startDate and endDate (ISO-8601).",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Range start (ISO date or datetime)" },
          endDate: { type: "string", description: "Range end (ISO date or datetime)" },
          timezone: { type: "string", description: "IANA timezone, e.g. America/New_York" },
          calendarId: { type: "string", description: "Optional GHL calendar id override" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "Create or upsert a GoHighLevel contact for the caller.",
      parameters: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["firstName", "phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_contact",
      description: "Look up an existing GoHighLevel contact by phone number.",
      parameters: {
        type: "object",
        properties: {
          phone: { type: "string" },
        },
        required: ["phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description:
        "Book a confirmed appointment. Provide contactId or firstName+phone to create/find the contact.",
      parameters: {
        type: "object",
        properties: {
          contactId: { type: "string" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          startTime: { type: "string", description: "Appointment start (ISO-8601)" },
          endTime: { type: "string", description: "Optional end (ISO-8601)" },
          timezone: { type: "string" },
          calendarId: { type: "string" },
          title: { type: "string" },
          notes: { type: "string" },
        },
        required: ["startTime"],
      },
    },
  },
] as const;

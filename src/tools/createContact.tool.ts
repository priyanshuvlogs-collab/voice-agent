import { asString, asStringArray, type ToolDefinition } from "./types";

export const createContactTool: ToolDefinition = {
  name: "create_contact",
  aliases: ["createContact", "ghl_create_contact", "upsert_contact", "capture_lead"],
  description: "Create or update a GoHighLevel contact from caller details.",
  async execute(args, context) {
    const { contact, created } = await context.ghl.createContact({
      firstName: asString(args.firstName),
      lastName: asString(args.lastName),
      name: asString(args.name) ?? asString(args.fullName),
      email: asString(args.email),
      phone: asString(args.phone) ?? context.callerNumber,
      tags: asStringArray(args.tags),
    });

    context.sessions.attachContact(context.call?.id, contact.id, context.callerNumber);
    return {
      ok: true,
      created,
      spoken: created
        ? `I've saved ${contact.firstName ?? contact.name ?? "the caller"} as a new contact. Their contact id is ${contact.id}.`
        : `I updated the existing contact for ${contact.firstName ?? contact.name ?? "the caller"}. Their contact id is ${contact.id}.`,
      contact,
    };
  },
};

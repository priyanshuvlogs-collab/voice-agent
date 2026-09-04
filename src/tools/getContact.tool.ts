import { asString, type ToolDefinition } from "./types";

export const getContactTool: ToolDefinition = {
  name: "get_contact",
  aliases: ["getContact", "ghl_get_contact", "find_contact"],
  description: "Look up an existing GoHighLevel contact by id, phone, or email.",
  async execute(args, context) {
    const contact = await context.ghl.getContact({
      contactId: asString(args.contactId),
      phone: asString(args.phone) ?? context.callerNumber,
      email: asString(args.email),
    });

    if (!contact) {
      return {
        ok: true,
        found: false,
        spoken: "I could not find an existing contact. Collect their name and create a new contact before booking.",
      };
    }

    context.sessions.attachContact(context.call?.id, contact.id, context.callerNumber);
    return {
      ok: true,
      found: true,
      spoken: `Found contact ${contact.firstName ?? contact.name ?? "on file"} with id ${contact.id}. Use this contactId when booking.`,
      contact,
    };
  },
};

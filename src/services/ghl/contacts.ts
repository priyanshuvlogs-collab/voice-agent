import { env } from "../../config/env.js";
import type { ContactPayload, ContactRecord } from "../../types/domain.js";
import { normalizePhoneE164 } from "../../utils/helpers.js";
import { ghlRequest } from "./client.js";

interface GhlContactDto {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

interface GhlContactSearchResponse {
  contacts?: GhlContactDto[];
  contact?: GhlContactDto;
}

function mapContact(dto: GhlContactDto): ContactRecord {
  return {
    id: dto.id,
    firstName: dto.firstName,
    lastName: dto.lastName,
    phone: dto.phone,
    email: dto.email,
  };
}

export async function findContactByPhone(phone: string): Promise<ContactRecord | null> {
  const normalized = normalizePhoneE164(phone);
  const result = await ghlRequest<GhlContactSearchResponse>({
    method: "GET",
    path: "/contacts/",
    query: {
      locationId: env.GHL_LOCATION_ID,
      query: normalized,
      limit: 5,
    },
  });

  const contacts = result.contacts ?? (result.contact ? [result.contact] : []);
  const match =
    contacts.find((c) => c.phone && normalizePhoneE164(c.phone) === normalized) ??
    contacts[0];

  return match ? mapContact(match) : null;
}

export async function createContact(payload: ContactPayload): Promise<ContactRecord> {
  const body = {
    locationId: env.GHL_LOCATION_ID,
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: normalizePhoneE164(payload.phone),
    email: payload.email,
    tags: payload.tags ?? ["voice-receptionist"],
    source: payload.source ?? "AI Voice Receptionist",
  };

  const result = await ghlRequest<{ contact: GhlContactDto } | GhlContactDto>({
    method: "POST",
    path: "/contacts/",
    body,
  });

  const dto = "contact" in result && result.contact ? result.contact : (result as GhlContactDto);
  return mapContact(dto);
}

/**
 * Upsert-style helper: return existing contact by phone, otherwise create.
 */
export async function ensureContact(payload: ContactPayload): Promise<ContactRecord> {
  const existing = await findContactByPhone(payload.phone);
  if (existing) return existing;
  return createContact(payload);
}

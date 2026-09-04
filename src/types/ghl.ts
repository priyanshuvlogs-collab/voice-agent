export interface GhlContact {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  locationId?: string;
  timezone?: string;
}

export interface GhlUpsertContactRequest {
  locationId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  tags?: string[];
  timezone?: string;
}

export interface GhlUpsertContactResponse {
  contact: GhlContact;
  new?: boolean;
}

export interface GhlSearchContactsResponse {
  contacts: GhlContact[];
}

export interface GhlFreeSlotsResponse {
  [date: string]:
    | {
        slots?: string[];
      }
    | string
    | undefined;
}

export interface GhlCreateAppointmentRequest {
  calendarId: string;
  locationId: string;
  contactId: string;
  startTime: string;
  endTime?: string;
  title?: string;
  appointmentStatus?: "new" | "confirmed";
  toNotify?: boolean;
  address?: string;
  description?: string;
  assignedUserId?: string;
}

export interface GhlAppointment {
  id: string;
  calendarId: string;
  locationId: string;
  contactId: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  appointmentStatus?: string;
}

export interface GhlAppointmentResponse {
  id?: string;
  appointment?: GhlAppointment;
}

export interface NormalizedSlot {
  startTime: string;
  label: string;
  date: string;
}

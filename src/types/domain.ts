export type IsoDateTime = string;

export interface CallerIdentity {
  phone: string;
  callerName?: string;
  callSid?: string;
}

export interface AvailabilitySlot {
  startTime: IsoDateTime;
  endTime: IsoDateTime;
}

export interface ContactPayload {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  tags?: string[];
  source?: string;
}

export interface ContactRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

export interface AppointmentPayload {
  contactId: string;
  calendarId?: string;
  startTime: IsoDateTime;
  endTime?: IsoDateTime;
  title?: string;
  notes?: string;
  timezone?: string;
}

export interface AppointmentRecord {
  id: string;
  contactId: string;
  calendarId: string;
  startTime: IsoDateTime;
  endTime: IsoDateTime;
  status?: string;
}

export interface ToolResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

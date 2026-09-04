import type { Env } from "../config/env";
import type {
  GhlAppointment,
  GhlAppointmentResponse,
  GhlCreateAppointmentRequest,
  GhlFreeSlotsResponse,
  GhlSearchContactsResponse,
  GhlUpsertContactRequest,
  GhlUpsertContactResponse,
} from "../types/ghl";
import { UpstreamError } from "../utils/errors";
import type { HttpTransport } from "./http.client";

export class GhlClient {
  constructor(
    private readonly env: Env,
    private readonly http: HttpTransport,
  ) {}

  async upsertContact(payload: GhlUpsertContactRequest): Promise<GhlUpsertContactResponse> {
    return this.request<GhlUpsertContactResponse>("POST", "/contacts/upsert", {
      version: this.env.GHL_CONTACTS_API_VERSION,
      body: payload,
    });
  }

  async searchContacts(params: { phone?: string; email?: string; query?: string }): Promise<GhlSearchContactsResponse> {
    const data = await this.request<GhlSearchContactsResponse>("GET", "/contacts/", {
      version: this.env.GHL_CONTACTS_API_VERSION,
      query: {
        locationId: this.env.GHL_LOCATION_ID,
        phone: params.phone,
        email: params.email,
        query: params.query,
        limit: 5,
      },
    });
    return { contacts: data.contacts ?? [] };
  }

  async getContact(contactId: string): Promise<GhlUpsertContactResponse> {
    return this.request<GhlUpsertContactResponse>("GET", `/contacts/${encodeURIComponent(contactId)}`, {
      version: this.env.GHL_CONTACTS_API_VERSION,
    });
  }

  async getFreeSlots(params: {
    calendarId: string;
    startDateMs: number;
    endDateMs: number;
    timeZone: string;
  }): Promise<GhlFreeSlotsResponse> {
    return this.request<GhlFreeSlotsResponse>(
      "GET",
      `/calendars/${encodeURIComponent(params.calendarId)}/free-slots`,
      {
        version: this.env.GHL_CALENDARS_API_VERSION,
        query: {
          startDate: params.startDateMs,
          endDate: params.endDateMs,
          timezone: params.timeZone,
        },
      },
    );
  }

  async createAppointment(payload: GhlCreateAppointmentRequest): Promise<GhlAppointment> {
    const data = await this.request<GhlAppointmentResponse>("POST", "/calendars/events/appointments", {
      version: this.env.GHL_CALENDARS_API_VERSION,
      body: payload,
    });
    if (data.appointment) {
      return data.appointment;
    }
    if (data.id) {
      return data as GhlAppointment;
    }
    throw new UpstreamError("ghl", "GoHighLevel returned an empty appointment payload", { details: data });
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    options: {
      version: string;
      body?: unknown;
      query?: Record<string, string | number | undefined>;
    },
  ): Promise<T> {
    if (!this.env.GHL_API_KEY) {
      throw new UpstreamError("ghl", "GHL_API_KEY is not configured", { statusCode: 500 });
    }

    try {
      const response = await this.http.request<T>({
        method,
        url: `${this.env.GHL_API_BASE_URL}${path}`,
        timeoutMs: this.env.GHL_TIMEOUT_MS,
        query: options.query,
        body: options.body,
        headers: {
          Authorization: `Bearer ${this.env.GHL_API_KEY}`,
          Version: options.version,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof UpstreamError) {
        throw new UpstreamError("ghl", `GoHighLevel request failed: ${error.message}`, {
          statusCode: error.statusCode,
          details: error.details,
          cause: error,
        });
      }
      throw error;
    }
  }
}

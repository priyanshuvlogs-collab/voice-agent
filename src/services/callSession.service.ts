export interface CallSession {
  twilioCallSid: string;
  callerNumber: string;
  calledNumber?: string;
  vapiCallId?: string;
  contactId?: string;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;

export class CallSessionStore {
  private readonly sessions = new Map<string, CallSession>();

  constructor(private readonly ttlMs = DEFAULT_TTL_MS) {}

  upsert(partial: Omit<CallSession, "createdAt" | "updatedAt"> & Partial<Pick<CallSession, "createdAt" | "updatedAt">>): CallSession {
    this.evictExpired();
    const existing = this.sessions.get(partial.twilioCallSid);
    const now = Date.now();
    const next: CallSession = {
      twilioCallSid: partial.twilioCallSid,
      callerNumber: partial.callerNumber || existing?.callerNumber || "",
      calledNumber: partial.calledNumber ?? existing?.calledNumber,
      vapiCallId: partial.vapiCallId ?? existing?.vapiCallId,
      contactId: partial.contactId ?? existing?.contactId,
      createdAt: existing?.createdAt ?? partial.createdAt ?? now,
      updatedAt: now,
    };
    this.sessions.set(next.twilioCallSid, next);
    if (next.vapiCallId) {
      this.sessions.set(`vapi:${next.vapiCallId}`, next);
    }
    return next;
  }

  getByTwilioSid(callSid: string): CallSession | undefined {
    this.evictExpired();
    return this.sessions.get(callSid);
  }

  getByVapiCallId(callId: string): CallSession | undefined {
    this.evictExpired();
    return this.sessions.get(`vapi:${callId}`);
  }

  attachContact(vapiCallId: string | undefined, contactId: string, callerNumber?: string): void {
    if (!vapiCallId) {
      return;
    }
    const existing = this.getByVapiCallId(vapiCallId);
    this.upsert({
      twilioCallSid: existing?.twilioCallSid ?? `vapi-only:${vapiCallId}`,
      callerNumber: callerNumber || existing?.callerNumber || "",
      vapiCallId,
      contactId,
    });
  }

  size(): number {
    this.evictExpired();
    return [...this.sessions.keys()].filter((key) => !key.startsWith("vapi:")).length;
  }

  private evictExpired(): void {
    const cutoff = Date.now() - this.ttlMs;
    for (const [key, session] of this.sessions) {
      if (session.updatedAt < cutoff) {
        this.sessions.delete(key);
      }
    }
  }
}

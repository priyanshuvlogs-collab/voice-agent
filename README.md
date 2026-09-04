# AI Voice Receptionist

Production-ready, low-latency Node.js / TypeScript / Express microservice that:

1. Answers inbound phone calls on **Twilio**
2. Hands the live audio stream to a **Vapi.ai** assistant
3. Executes real-time function/tool calls against **GoHighLevel API v2** to check calendar availability, upsert contacts, and book appointments

```
Caller → Twilio → POST /webhooks/twilio/inbound
                 → Vapi /call (phoneCallProviderBypassEnabled)
                 → TwiML back to Twilio
                 → Vapi conversation
                 → POST /webhooks/vapi  (tool-calls)
                 → GoHighLevel calendars + contacts
```

## Directory structure

```
src/
  index.ts                 Process entry, graceful shutdown
  app.ts                   Express factory
  container.ts             Dependency wiring
  config/                  Env validation (Zod) and Pino logger
  clients/                 Keep-alive HTTP + GHL/Vapi adapters
  controllers/             Route handlers
  middleware/              Auth, request IDs, errors
  routes/                  Health, Twilio, Vapi
  services/                Call sessions, GHL orchestration, Vapi inbound
  tools/                   Function-call registry
  types/                   Vapi + GHL contracts
  utils/                   Phone, time, crypto, errors
tests/                     Unit + webhook integration tests
scripts/                   Example Vapi assistant payload
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness |
| `GET` | `/ready` | Readiness (Twilio / Vapi / GHL configured) |
| `GET` | `/tools` | Tool catalog |
| `POST` | `/webhooks/twilio/inbound` | Twilio voice webhook. Creates a Vapi call and returns TwiML. |
| `POST` | `/webhooks/twilio/status` | Twilio status callback |
| `POST` | `/webhooks/vapi` | Vapi Server URL (assistant-request, tool-calls, end-of-call-report, …) |
| `POST` | `/webhooks/vapi/tools` | Same handler, dedicated tool URL |

Point the Twilio number's Voice webhook at `https://<host>/webhooks/twilio/inbound` and the Vapi assistant / phone-number Server URL at `https://<host>/webhooks/vapi`.

## Voice tools

Vapi `tool-calls` (and legacy `function-call`) messages are dispatched here:

| Tool | Aliases | GHL API |
| --- | --- | --- |
| `check_availability` | `checkAvailability`, `checkGHLAvailability` | `GET /calendars/{id}/free-slots` |
| `get_contact` | `getContact`, `find_contact` | `GET /contacts/` or `GET /contacts/{id}` |
| `create_contact` | `createContact`, `upsert_contact`, `capture_lead` | `POST /contacts/upsert` |
| `book_appointment` | `bookAppointment`, `create_event`, `ghl_create_event` | `POST /calendars/events/appointments` |

Each tool returns JSON with a `spoken` field the assistant can read back to the caller. Tool failures never take the call down — they return a graceful spoken fallback.

`book_appointment` upserts the contact when `contactId` is missing, then books a confirmed slot. Duration defaults to `GHL_APPOINTMENT_DURATION_MINUTES` (30).

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Expose the server (ngrok, Cloudflare Tunnel, or similar) and set `WEBHOOK_BASE_URL` to that public origin.

```bash
npm test
npm run typecheck
npm run build
```

Simulate an inbound call (signature validation off):

```bash
curl -X POST http://localhost:3000/webhooks/twilio/inbound \
  -d "CallSid=CA123" \
  -d "Caller=+15551112222" \
  -d "Called=+15551234567"
```

Simulate a Vapi availability tool call:

```bash
curl -X POST http://localhost:3000/webhooks/vapi/tools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VAPI_WEBHOOK_SECRET" \
  -d '{
    "message": {
      "type": "tool-calls",
      "call": { "id": "call_1", "customer": { "number": "+15551112222" } },
      "toolCallList": [
        { "id": "tc_1", "name": "check_availability", "arguments": { "startDate": "tomorrow" } }
      ]
    }
  }'
```

## Production notes

- **Fail fast** on missing secrets (`assertRuntimeSecrets` at boot).
- **Twilio** requests are verified with `X-Twilio-Signature` against `WEBHOOK_BASE_URL`.
- **Vapi** requests accept `Authorization: Bearer <VAPI_WEBHOOK_SECRET>` or `X-Vapi-Secret`.
- Outbound GHL/Vapi calls use short timeouts (4–5s), one retry on 429/5xx, and keep-alive HTTP.
- In-memory call sessions map Twilio `CallSid` ↔ Vapi call id ↔ GHL `contactId` for 2 hours. Use Redis if you run more than one replica and need sticky session context.
- Structured Pino logs redact tokens and mask phone numbers.
- Helmet, compression, and a 240 req/min rate limit are enabled. `/health` and `/ready` are skipped.

Docker:

```bash
docker compose up --build
```

## Vapi assistant tools

Create Function tools in the Vapi dashboard (or API) with Server URL `https://<host>/webhooks/vapi/tools` and these names/parameters:

**check_availability** — `startDate`, `endDate`, `timeZone`  
**get_contact** — `phone`, `email`, `contactId`  
**create_contact** — `firstName`, `lastName`, `name`, `email`, `phone`  
**book_appointment** — `startTime`, `endTime`, `contactId`, `firstName`, `name`, `phone`, `email`, `title`

See `scripts/vapi-assistant.example.json` for a starter assistant payload.

## Environment

Copy `.env.example`. Required in production:

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- `VAPI_API_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_PHONE_NUMBER_ID`, `VAPI_WEBHOOK_SECRET`
- `GHL_API_KEY`, `GHL_LOCATION_ID`, `GHL_CALENDAR_ID`
- `WEBHOOK_BASE_URL`

GHL calendar routes send `Version: 2021-04-15`. Contact routes send `Version: 2021-07-28`. Override with `GHL_CALENDARS_API_VERSION` / `GHL_CONTACTS_API_VERSION` if your account expects `v3`.

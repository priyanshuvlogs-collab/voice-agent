# AI Voice Receptionist

Production-oriented Node.js / TypeScript / Express microservice that:

1. Accepts inbound phone calls via **Twilio**
2. Orchestrates conversational voice with **Vapi.ai**
3. Executes real-time tool calls against **GoHighLevel (GHL) API v2** to check availability, create contacts, and book appointments

## Architecture

```
src/
├── index.ts                 # Process entry + graceful shutdown
├── app.ts                   # Express app factory
├── config/
│   └── env.ts               # Zod-validated environment
├── controllers/
│   └── webhookController.ts # Twilio + Vapi + tool HTTP handlers
├── middleware/
│   ├── errorHandler.ts
│   ├── validateTwilioSignature.ts
│   └── validateVapiSecret.ts
├── routes/
│   ├── index.ts
│   ├── health.ts
│   ├── tools/
│   │   └── index.ts         # /tools + /tools/:toolName
│   └── webhooks/
│       ├── twilio.ts        # POST /webhooks/twilio/voice
│       └── vapi.ts          # POST /webhooks/vapi
├── services/
│   ├── ghl/
│   │   ├── client.ts        # Typed GHL HTTP client
│   │   ├── contacts.ts
│   │   ├── calendar.ts
│   │   ├── appointments.ts
│   │   └── index.ts
│   ├── twilio/
│   │   └── voice.ts         # TwiML + inbound logging
│   └── vapi/
│       ├── client.ts        # Optional outbound call helper
│       └── tools.ts         # Tool dispatch + Vapi tool definitions
├── types/
│   ├── domain.ts
│   └── tools.ts             # Zod schemas for tool args
└── utils/
    ├── errors.ts
    ├── helpers.ts
    └── logger.ts            # Pino
```

### Call / tool flow

```
Caller → Twilio number
       → (recommended) Vapi-owned Twilio import handles media
       → Vapi assistant conversation
       → tool-calls webhook → this service
       → GHL API v2 (contacts / free-slots / appointments)
       → result returned to Vapi → spoken to caller
```

This service also exposes `POST /webhooks/twilio/voice` for logging or custom pre-connect TwiML when Twilio still terminates first.

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Operator interface (HTML) |
| `GET` | `/how-it-works` | Interactive step-by-step system walkthrough |
| `GET` | `/api` | Service discovery JSON |
| `GET` | `/health` | Liveness |
| `GET` | `/health/ready` | Readiness |
| `POST` | `/webhooks/twilio/voice` | Twilio Voice webhook (signature validated) |
| `POST` | `/webhooks/vapi` | Vapi server URL (tool-calls, status, EOC) |
| `GET` | `/tools/definitions` | JSON tool schemas for Vapi assistant setup |
| `POST` | `/tools` | Execute tool by `{ name, arguments }` |
| `POST` | `/tools/:toolName` | Execute a named tool |

### Tools

- `check_availability` — GHL calendar free slots
- `find_contact` — lookup contact by phone
- `create_contact` — create/upsert contact
- `book_appointment` — confirm appointment (auto-ensures contact when needed)

## Quick start

```bash
cp .env.example .env
# fill Twilio, Vapi, and GHL credentials

npm install
npm run dev
```

Expose the server (ngrok / Cloudflare Tunnel), then:

1. **Vapi** → Assistant → Server URL = `https://<host>/webhooks/vapi`
2. Add the four tools (or `GET /tools/definitions`) with server URLs pointing at `/tools/<name>` or the shared webhook
3. Set `VAPI_SERVER_URL_SECRET` to match the Vapi Server URL Secret
4. Import / attach your Twilio number in Vapi (preferred), **or** point Twilio Voice webhook to `POST /webhooks/twilio/voice`
5. Configure GHL Private Integration token with Contacts + Calendars scopes for the target location

```bash
npm run build && npm start
npm test
npm run typecheck
```

## Environment

See `.env.example`. Required at runtime:

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `VAPI_API_KEY`, `VAPI_ASSISTANT_ID`
- `GHL_API_KEY`, `GHL_LOCATION_ID`, `GHL_CALENDAR_ID`

Recommended:

- `PUBLIC_BASE_URL` — absolute public origin for Twilio signature validation behind proxies
- `VAPI_SERVER_URL_SECRET` — shared secret on Vapi callbacks
- `DEFAULT_TIMEZONE`, `APPOINTMENT_DURATION_MINUTES`, `BUSINESS_NAME`

## Design notes

- **Low latency:** thin Express handlers, direct `fetch` to GHL, no ORM, structured logging with request timing
- **Safety:** Zod on env + tool args, Twilio signature validation, optional Vapi shared secret, Helmet, bounded JSON body
- **Operational:** graceful SIGINT/SIGTERM shutdown, health endpoints, Pino logs suitable for aggregation


[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

# Nexora

Nexora is an AI-assisted personal operations workspace built with React and TypeScript. It helps users track commitments, monitor event priorities, store important documents, and run automations such as Google Form prefill generation using profile and vault data.

## Core Capabilities

- Secure authentication and profile management via Supabase Auth.
- Commitment management for bills, subscriptions, and manual financial obligations.
- Event Priority intelligence by combining Gmail and Calendar signals.
- AI-assisted Overview summary generation from current dashboard state.
- Document Vault for storing reusable identity and supporting records.
- Automations workspace for generating genuine Google Form prefilled links.
- WhatsApp integration surface for OTP and briefing workflows.

## Technology Stack

- Frontend: React 19, TypeScript, Vite 6, React Router
- UI: Tailwind CSS 4, Lucide icons, Motion animations
- Data and Auth: Supabase (`@supabase/supabase-js`)
- AI: Gemini API (`VITE_GEMINI_API_KEY`) for summaries and mapping
- Backend services: Express + Twilio (WhatsApp/OTP and briefing routes)

## Repository Structure

```text
.
|-- src/
|   |-- App.tsx
|   |-- pages/
|   |   |-- Dashboard.tsx
|   |   |-- Documents.tsx
|   |   |-- Automations.tsx
|   |   |-- Auth.tsx
|   |   `-- ...
|   `-- lib/
|       |-- AuthContext.tsx
|       |-- supabase.ts
|       |-- chat.ts
|       |-- gmail.ts
|       |-- autofill.ts
|       |-- documentVault.ts
|       `-- ...
|-- backend/
|   |-- src/
|   |   |-- server.ts
|   |   |-- routes/
|   |   `-- lib/
|-- DATABASE_SETUP.sql
|-- SUPABASE_DASHBOARD_SCHEMA.sql
|-- SUPABASE_SETUP.md
|-- USER_SETUP.md
|-- WHATSAPP_INTEGRATION_GUIDE.md
`-- package.json
```

## Environment Variables

Create `.env.local` in the project root and configure at least:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

Optional backend and messaging variables are documented in:

- `WHATSAPP_INTEGRATION_GUIDE.md`
- `SUPABASE_SETUP.md`
- `USER_SETUP.md`

## Database Setup

1. Open Supabase SQL Editor.
2. Run `DATABASE_SETUP.sql`.
3. Run `SUPABASE_DASHBOARD_SCHEMA.sql` if seeded dashboard artifacts are required.
4. Verify tables, policies, and indexes were created.

## Local Development

Install dependencies:

```bash
npm install
```

Run frontend:

```bash
npm run dev
```

Build frontend:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Type-check:

```bash
npm run lint
```

Backend (from repository root):

```bash
cd backend
npm install
npm run dev
```

## Product Workflows

### Overview Summarise

The Overview card includes a `Summarise` action that sends current commitments and priorities to the LLM and returns a concise operational summary.

### Document Vault

The Documents tab is dedicated to ingesting and storing reusable document metadata and extracted fields.

### Automations (Google Forms)

The Automations tab generates real Google Form prefilled URLs by combining:

- User profile fields
- Vault document fields
- Explicit Google Form `entry.*` mappings

Output links are ready to open or share.

## Routing Model

- Public: `/`, `/auth`, marketing pages
- Protected: `/dashboard`
- Dashboard sections: Overview, Commitments, Event Priority, Tasks, Documents, Automations, Settings

## Security and Compliance Notes

- Never commit `.env.local`.
- Review Supabase RLS policies before production use.
- Treat document vault content as sensitive personal data.
- Restrict and rotate API keys used for AI and messaging providers.

## Known Operational Notes

- Vite may warn about chunk size during production build; this does not block successful builds.
- If environment variables change, restart the dev server.

## License

No license is currently declared. Add an explicit license before external distribution.

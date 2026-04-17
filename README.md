# Nexora

Nexora is a React + TypeScript web app for managing personal commitments like bills and subscriptions, with authentication and data storage powered by Supabase.

## What This Project Includes

- Landing page with product messaging and entry point to auth
- Email/password authentication (sign up, sign in, sign out)
- Protected dashboard routes based on auth state
- Supabase-backed user profiles, bills, and subscriptions data model
- React hooks for bills and subscriptions CRUD flows

## Tech Stack

- React 19
- TypeScript
- Vite 6
- React Router
- Supabase JS client
- Tailwind CSS 4
- Lucide icons and Motion animations

## Project Structure

```text
.
|-- src
|   |-- App.tsx
|   |-- pages
|   |   |-- Hero.tsx
|   |   |-- Auth.tsx
|   |   `-- Dashboard.tsx
|   `-- lib
|       |-- supabase.ts
|       |-- AuthContext.tsx
|       |-- database.ts
|       |-- useBills.ts
|       `-- useSubscriptions.ts
|-- DATABASE_SETUP.sql
|-- SUPABASE_SETUP.md
|-- USER_SETUP.md
`-- .env.example
```

## Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project

## Environment Setup

Create a local environment file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:your_password@db.your-project-id.supabase.co:5432/postgres
```

You can copy from `.env.example` and then update values.

## Database Setup (Supabase)

1. Open your Supabase project dashboard.
2. Go to SQL Editor.
3. Run the schema from `DATABASE_SETUP.sql`.
4. Confirm tables and policies were created.

Additional guides:

- `SUPABASE_SETUP.md`
- `USER_SETUP.md`

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open the URL printed in the terminal (usually http://localhost:3000).

## Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally
- `npm run lint` - Type-check with TypeScript
- `npm run clean` - Remove dist directory

## Authentication and Routing

- Public routes:
   - `/` (landing page)
   - `/auth` (sign in / sign up)
- Protected route:
   - `/dashboard` (requires authenticated user)

Auth and session state are managed in `src/lib/AuthContext.tsx`.

## Data Layer

Main helpers and hooks:

- `src/lib/database.ts` - generic Supabase helper methods
- `src/lib/useBills.ts` - bills fetching and mutations
- `src/lib/useSubscriptions.ts` - subscriptions fetching, mutations, and monthly cost calculation

## Common Issues

- Port already in use:
   - Vite may auto-switch to the next port (for example 3001 or 3002).
- Auth user created but profile missing:
   - Ensure `DATABASE_SETUP.sql` was executed and `users` table exists.
- Environment variables not picked up:
   - Restart the dev server after editing `.env.local`.

## Security Notes

- Never commit `.env.local`.
- Keep your Supabase keys private where required.
- Verify Row Level Security policies before production deployment.

## Deployment

This app can be deployed to any static hosting platform that supports Vite build output.

Build command:

```bash
npm run build
```

Preview build locally:

```bash
npm run preview
```

## License

Add your preferred license here (MIT, Apache-2.0, proprietary, etc.).

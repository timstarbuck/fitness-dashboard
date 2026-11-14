# Hermes Agent Configuration

This file defines the operational guidelines and context for Hermes Agents working on this repository.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **UI Components:** Shadcn UI
- **Database ORM:** Drizzle ORM
- **Database Hosting:** Neon (PostgreSQL)
- **Deployment:** Vercel

## Agent Guidelines

### 🛠️ Development Standards
- **Type Safety:** Strict TypeScript usage is mandatory. Avoid `any`. Define interfaces for all API responses (especially Garmin) and database models using Drizzle schema definitions.
- **Component Architecture:** Use Shadcn UI for all base components. Follow the Next.js App Router pattern (Server Components by default, Client Components only when necessary for interactivity).
- **Styling:** Use TailwindCSS utility classes. Avoid inline styles or CSS modules unless strictly required for complex animations.
- **Data Fetching:** Prefer Server Components and Server Actions for data fetching to minimize client-side JS. Use Drizzle ORM for all database interactions.

### 📂 Directory Structure Conventions
- `app/`: Next.js App Router (pages, layouts, loading states).
- `components/ui/`: Shadcn UI primitives.
- `components/dashboard/`: Custom dashboard components.
- `lib/`: Utility functions and shared logic (e.g., Garmin API client, Drizzle client).
- `db/`: Drizzle schema definitions and database connection logic.
- `types/`: Centralized TypeScript definitions.

### 🚀 Deployment & Environment
- **Environment Variables:** All sensitive keys (Garmin API credentials, Neon connection string) must be managed via `.env.local` and configured in Vercel's environment settings.
- **Deployment Target:** Vercel. Ensure all Next.js features used are compatible with Vercel's edge/serverless runtime.

## Workflow
1. **Plan:** Use `agents.md` to identify the responsible agent for a task.
2. **Execute:** Implement changes following the tech stack and standards above.
3. **Verify:** Ensure types are correct and components render as expected using `dogfood` or manual verification.

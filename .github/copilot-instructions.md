# Copilot Instructions for Fitness Dashboard

## Project Overview
This is a Next.js 14+ application for tracking fitness activities, built with:
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: Drizzle ORM with Neon PostgreSQL
- **Authentication**: Garmin Connect API integration

## Tech Stack Details

### UI Components
- **shadcn/ui**: Customizable, accessible components in `src/components/ui/`
- **Tailwind CSS**: Utility-first CSS framework with custom config in `tailwind.config.js`
- **Radix UI**: Headless component primitives used by shadcn/ui

### Database & ORM
- **Drizzle ORM**: Lightweight TypeScript ORM for SQL queries
- **Neon PostgreSQL**: Serverless PostgreSQL database
- **Schema location**: `src/db/schema.ts`
- **Migrations**: Managed via Drizzle Kit (`drizzle-kit`)

### Data Fetching & API Routes
- **Server Components**: Used for data fetching where possible
- **API Routes**: Located in `src/app/api/`
- **Garmin Integration**: Custom service layer at `src/services/garmin/`

### Key Files & Structure
```
src/
├── app/                  # Next.js App Router
│   ├── (main)/           # Main application routes
│   │   ├── dashboard/     # Dashboard pages
│   │   └── activities/    # Activity tracking
│   ├── api/              # API routes
│   │   └── sync/          # Garmin sync endpoints
│   └── layout.tsx        # Root layout with providers
├── components/           # Reusable components
│   ├── ui/               # shadcn/ui components (button, card, etc.)
│   └── shared/           # Custom shared components
├── db/                   # Database configuration
│   ├── schema.ts         # Drizzle schema definitions
│   └── index.ts          # Database connection setup
├── services/             # Business logic
│   └── garmin/           # Garmin API integration
│       ├── token.ts      # Authentication
│       ├── activities.ts  # Data fetching
│       └── sync.ts       # Sync logic with rate limiting
└── lib/                  # Utilities and helpers
    └── utils.ts          # Shared utility functions
```

## Development Workflow

### Setup & Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Fill in values from your Neon dashboard and Garmin API
   ```

### Database Operations
- **Generate migrations**: `npx drizzle-kit generate:pg`
- **Push migrations**: `npx drizzle-kit push:pg`
- **Studio**: `npx drizzle-kit studio` (for database exploration)

### Running the Application
- **Development**: `npm run dev`
- **Production**: `npm run build && npm start`

## Coding Conventions

### Component Structure
- Use TypeScript for all components
- Follow shadcn/ui patterns for new components
- Place custom UI components in `src/components/ui/`

### Database Operations
- Always use Drizzle ORM for database access
- Define schemas in `src/db/schema.ts`
- Use transactions for multi-table operations:
  ```typescript
  await db.transaction(async (tx) => {
    await tx.insert(table1).values(...)
    await tx.update(table2).set(...)
  })
  ```

### API Routes
- Use Next.js Route Handlers (`app/api/route.ts`)
- Validate input with Zod schemas
- Handle errors gracefully:
  ```typescript
  try {
    // operation
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
  ```

### Garmin API Integration
- Handle rate limits (429 errors) with retry logic
- Use the existing `getRetryDelayFromError()` helper
- Example:
  ```typescript
  try {
    const data = await fetchGarminData(token)
  } catch (error) {
    const retryDelay = getRetryDelayFromError(error)
    if (retryDelay) {
      await delay(retryDelay * 1000)
      const data = await fetchGarminData(token) // retry
    }
  }
  ```

## Common Patterns

### Form Handling
Use React Hook Form with Zod validation:
```typescript
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

const formSchema = z.object({
  // fields
})

export function MyForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })
  // ...
}
```

### Data Fetching in Server Components
```typescript
import { db } from "~/db"
import { activities } from "~/db/schema"

async function ActivitiesList() {
  const data = await db.query.activities.findMany({
    where: (a, { eq }) => eq(a.userId, "current-user"),
    orderBy: (a, { desc }) => desc(a.startTimeGmt),
  })
  
  return (
    <div className="grid gap-4">
      {data.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  )
}
```

### Creating New UI Components
1. Use shadcn/ui CLI to scaffold:
   ```bash
   npx shadcn-ui@latest add button
   ```
2. Customize in `src/components/ui/button.tsx`
3. Export and use throughout the app

## Environment Variables
Required variables in `.env.local`:
```
DATABASE_URL="postgres://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/dbname?sslmode=require"
GARMIN_API_KEY="your-garmin-api-key"
CRON_SECRET="secure-secret-for-cron-jobs"
TIMEZONE="America/New_York" # User's timezone for date handling
```

## Testing
- **Unit tests**: Use Vitest (`src/**/*.test.ts`)
- **E2E tests**: Playwright (config in `playwright.config.ts`)
- Run tests:
  ```bash
  npm test         # Unit tests
  npm run test:e2e # E2E tests
  ```

## Deployment
- **Platform**: Vercel (recommended)
- **Database**: Neon PostgreSQL
- **Build command**: `npm run build`
- **Start command**: `npm start`

## Additional Notes
- This project uses bi-directional sync with Garmin Connect API
- Activities are stored with full metadata (distance, duration, heart rate, etc.)
- The dashboard provides visualizations of fitness trends over time
- Rate limiting is handled gracefully with automatic retries
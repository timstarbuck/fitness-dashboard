import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import {
  syncGarminActivities,
  syncGarminHRV,
  syncGarminSleep,
  syncGarminUserDailySummary,
  resolveSyncTypes,
  SYNC_TYPES,
  type SyncOptions,
  type SyncType,
} from '@/services/garmin/sync';
import { acquireSyncLock, releaseSyncLock } from '@/services/garmin/syncLock';

// Lock name for this sync process. Must be unique per sync type so that
// different syncs (e.g. activities vs sleep) don't block each other.
const LOCK_NAME = 'garmin-activities';

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/**
 * Accept the shared secret via `Authorization: Bearer <secret>` header or a
 * `?token=<secret>` query string. Returns null when neither is provided.
 */
function extractProvidedSecret(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim() || null;
  }
  return request.nextUrl.searchParams.get('token');
}

/** Strict YYYY-MM-DD check that also rejects impossible dates like 2026-02-30. */
function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Read optional `startDate`/`endDate` (YYYY-MM-DD), `syncType`, and the legacy
 * `syncHRV`/`syncSleep` query params. Returns a 400 response when any is
 * malformed, or the options object otherwise (omitted params keep their
 * defaults in the sync service).
 */
function parseSyncParams(
  request: NextRequest
): { options?: SyncOptions; error?: NextResponse } {
  const startDate = request.nextUrl.searchParams.get('startDate') ?? undefined;
  const endDate = request.nextUrl.searchParams.get('endDate') ?? undefined;
  const syncHRV = request.nextUrl.searchParams.get('syncHRV') === 'true';
  const syncSleep = request.nextUrl.searchParams.get('syncSleep') === 'true';
  const syncTypeRaw = request.nextUrl.searchParams.get('syncType') ?? undefined;

  for (const [name, value] of Object.entries({ startDate, endDate })) {
    if (value !== undefined && !isValidCalendarDate(value)) {
      return {
        error: NextResponse.json(
          { error: `Invalid ${name}. Expected a real date in YYYY-MM-DD format.` },
          { status: 400 }
        ),
      };
    }
  }

  if (startDate && endDate && startDate > endDate) {
    return {
      error: NextResponse.json(
        { error: 'startDate must be on or before endDate.' },
        { status: 400 }
      ),
    };
  }

  let syncType: SyncType | undefined;
  if (syncTypeRaw !== undefined) {
    if (!(SYNC_TYPES as readonly string[]).includes(syncTypeRaw)) {
      return {
        error: NextResponse.json(
          { error: `Invalid syncType. Expected one of: ${SYNC_TYPES.join(', ')}.` },
          { status: 400 }
        ),
      };
    }
    syncType = syncTypeRaw as SyncType;
  }

  return { options: { startDate, endDate, syncHRV, syncSleep, syncType } };
}

async function handleSync(request: NextRequest): Promise<NextResponse> {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    // Fail closed: never run an unauthenticated sync.
    return NextResponse.json(
      { error: 'Sync is not configured. Set the CRON_SECRET environment variable.' },
      { status: 503 }
    );
  }

  const providedSecret = extractProvidedSecret(request);
  if (!providedSecret || !timingSafeEqual(sha256(providedSecret), sha256(expectedSecret))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { options, error: parseError } = parseSyncParams(request);
  if (parseError) return parseError;

  // Single-flight guard. The lock lives in Postgres so it works across
  // serverless function instances (an in-memory flag would not, since each
  // request runs in a fresh instance on Vercel).
  let lockToken: string | null;
  try {
    lockToken = await acquireSyncLock(LOCK_NAME);
  } catch (error) {
    console.error('API: Failed to acquire sync lock:', error);
    return NextResponse.json(
      { error: 'Unable to verify sync state. Try again later.' },
      { status: 503 }
    );
  }

  if (!lockToken) {
    return NextResponse.json(
      { error: 'A synchronization is already in progress.' },
      { status: 409, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    console.log('API: Starting Garmin sync via route handler...');
    
    const results = [];
    const syncOptions: SyncOptions = options || {};

    // Resolve which data types to sync. Default (no params) is all types;
    // `syncType` selects a single type; the legacy syncHRV/syncSleep booleans
    // keep their previous "only those types" behavior.
    const types = resolveSyncTypes(syncOptions);

    // Sync activities
    if (types.includes('activities')) {
      const activityResult = await syncGarminActivities(syncOptions);
      results.push({ type: 'activities', ...activityResult });
    }

    // Sync HRV data
    if (types.includes('hrv')) {
      const hrvResult = await syncGarminHRV(syncOptions);
      results.push({ type: 'hrv', ...hrvResult });
    }

    // Sync sleep data
    if (types.includes('sleep')) {
      const sleepResult = await syncGarminSleep(syncOptions);
      results.push({ type: 'sleep', ...sleepResult });
    }

    // Sync user daily summary data
    if (types.includes('usersummary')) {
      const summaryResult = await syncGarminUserDailySummary(syncOptions);
      results.push({ type: 'usersummary', ...summaryResult });
    }

    console.log('API: Garmin sync completed.')

    return NextResponse.json({
      message: 'Sync completed successfully',
      results,
    });
  } catch (error) {
    console.error('API: Sync failed:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    try {
      await releaseSyncLock(LOCK_NAME, lockToken);
    } catch (error) {
      // Not fatal: the lock expires via TTL if we can't release it.
      console.error('API: Failed to release sync lock (will expire via TTL):', error);
    }
  }
}

// Vercel cron can trigger with GET or POST; support both.
export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}
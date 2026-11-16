import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { syncGarminActivities, syncGarminHRV, type SyncOptions } from '@/services/garmin/sync';
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
 * Read optional `startDate`/`endDate` (YYYY-MM-DD) query params. Returns a
 * 400 response when either is malformed, or the options object otherwise
 * (omitted params keep their defaults in the sync service).
 */
function parseDateRange(
  request: NextRequest
): { options?: SyncOptions; error?: NextResponse } {
  const startDate = request.nextUrl.searchParams.get('startDate') ?? undefined;
  const endDate = request.nextUrl.searchParams.get('endDate') ?? undefined;
  const syncHRV = request.nextUrl.searchParams.get('syncHRV') === 'true';

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

  return { options: { startDate, endDate, syncHRV } };
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

  const { options, error: dateError } = parseDateRange(request);
  if (dateError) return dateError;

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
    
    // Sync activities
    if (!syncOptions.syncHRV) {
      const activityResult = await syncGarminActivities(syncOptions);
      results.push({ type: 'activities', ...activityResult });
    }
    
    // Sync HRV data
    if (syncOptions.syncHRV) {
      const hrvResult = await syncGarminHRV(syncOptions);
      results.push({ type: 'hrv', ...hrvResult });
    }
    
    console.log('API: Garmin sync completed.');

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
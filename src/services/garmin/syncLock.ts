import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../../db';
import { syncLocks } from '../../../db/schema';

// How long a lock stays valid before another request may re-claim it.
// Must be longer than the longest expected sync run (including Vercel's
// function timeout). If a function crashes or times out mid-sync, its lock
// simply expires and the next cron run picks it up.
const LOCK_TTL = sql`interval '10 minutes'`;

/**
 * Atomically claim a named sync lock.
 *
 * Returns the lock token on success, or null if another request currently
 * holds a fresh (unexpired) lock. Safe across serverless function instances:
 * the state lives in Postgres, not process memory.
 */
export async function acquireSyncLock(name: string): Promise<string | null> {
  const lockToken = randomUUID();

  // INSERT claims the lock when no row exists. ON CONFLICT re-claims an
  // existing row only if it is stale (expired). The WHERE clause makes the
  // whole statement atomic: exactly one concurrent caller can win.
  const result = await db.execute(sql`
    INSERT INTO sync_locks (name, lock_token, locked_at, expires_at)
    VALUES (${name}, ${lockToken}, now(), now() + ${LOCK_TTL})
    ON CONFLICT (name) DO UPDATE
      SET lock_token = ${lockToken},
          locked_at = now(),
          expires_at = now() + ${LOCK_TTL}
    WHERE sync_locks.expires_at < now()
  `);

  return result.rowCount === 1 ? lockToken : null;
}

/** Release a previously claimed lock, but only if we still own it. */
export async function releaseSyncLock(name: string, lockToken: string): Promise<void> {
  await db.delete(syncLocks).where(
    and(eq(syncLocks.name, name), eq(syncLocks.lockToken, lockToken))
  );
}

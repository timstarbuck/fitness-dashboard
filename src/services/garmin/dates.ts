// Shared Garmin date parsing (used by the DTO mappers and re-exported from
// hrv.ts / sleep.ts for backward compatibility).

/** Helper function to parse Garmin date strings (YYYY-MM-DD HH:mm:ss) or timestamps */
export function parseGarminDate(value?: string | number): Date | null {
  if (!value) return null;

  // Handle numeric timestamps
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Handle string dates
  const date = new Date(value.trim().replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Helper function to parse Garmin date strings or timestamps, or return undefined */
export function parseGarminDateOrUndefined(value?: string | number): Date | undefined {
  const parsed = parseGarminDate(value);
  return parsed === null ? undefined : parsed;
}

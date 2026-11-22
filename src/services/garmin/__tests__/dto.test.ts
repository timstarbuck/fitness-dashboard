import { describe, expect, it } from '@jest/globals';
import { toActivityRecord, toSplitRecords, toSleepRecord, toHrvRecord, toHrvReadingRecords } from '../dto';
import type { GarminActivity } from '../activities';

const baseActivity: GarminActivity = {
  activityId: 12345,
  activityName: 'Morning Run',
  startTimeLocal: '2024-01-15 12:00:00',
  startTimeGMT: '2024-01-15 17:00:00',
  endTimeGMT: '2024-01-15 17:30:00',
  activityType: { typeId: 1, typeKey: 'running', parentTypeId: 2 },
  distance: 8000,
  duration: 1800,
  elevationGain: 45,
  averageHR: 152,
  maxHR: 178,
  calories: 410,
};

describe('toActivityRecord', () => {
  it('maps a complete activity to the internal record', () => {
    const record = toActivityRecord(baseActivity);

    expect(record).not.toBeNull();
    expect(record?.garminActivityId).toBe(12345);
    expect(record?.activityName).toBe('Morning Run');
    expect(record?.activityType).toBe('running');
    expect(record?.startTimeGmt.toISOString()).toBe('2024-01-15T17:00:00.000Z');
    expect(record?.endTimeGmt.toISOString()).toBe('2024-01-15T17:30:00.000Z');
    expect(record?.durationSeconds).toBe(1800);
    expect(record?.avgHeartRate).toBe(152);
  });

  it('falls back to the type key when activityName is missing', () => {
    const record = toActivityRecord({ ...baseActivity, activityName: '' });

    expect(record?.activityName).toBe('running');
  });

  it('computes endTimeGmt from startTime + duration when missing', () => {
    const record = toActivityRecord({ ...baseActivity, endTimeGMT: undefined });

    expect(record?.endTimeGmt.toISOString()).toBe('2024-01-15T17:30:00.000Z'); // 17:00 + 1800s
  });

  it('returns null when startTimeLocal is missing', () => {
    expect(toActivityRecord({ ...baseActivity, startTimeLocal: undefined })).toBeNull();
  });

  it('returns null when startTimeGMT is invalid', () => {
    expect(toActivityRecord({ ...baseActivity, startTimeGMT: 'not-a-date' })).toBeNull();
  });

  it('nulls out optional fields that are absent', () => {
    const record = toActivityRecord({
      ...baseActivity,
      elevationGain: undefined,
      averageHR: undefined,
      maxHR: undefined,
    });

    expect(record?.elevationGain).toBeNull();
    expect(record?.avgHeartRate).toBeNull();
    expect(record?.maxHeartRate).toBeNull();
  });
});

describe('toSplitRecords', () => {
  it('returns an empty array when there are no splits', () => {
    expect(toSplitRecords('uuid-1')).toEqual([]);
    expect(toSplitRecords('uuid-1', [])).toEqual([]);
  });

  it('keys splits by the stored activity id and maps fields', () => {
    const records = toSplitRecords('stored-uuid', [
      { splitNumber: 1, distance: 2600, duration: 900, avgSpeed: 2.8 },
      { splitNumber: 2, distance: 2600, duration: 950 },
    ]);

    expect(records).toHaveLength(2);
    expect(records[0].activityId).toBe('stored-uuid');
    expect(records[0].splitNumber).toBe(1);
    expect(records[0].avgSpeed).toBe(2.8);
    expect(records[1].durationSeconds).toBe(950);
    expect(records[1].avgSpeed).toBeNull();
  });

  it('falls back to the index when splitNumber is missing', () => {
    const records = toSplitRecords('stored-uuid', [
      { splitNumber: 0, distance: 1000, duration: 300 },
      { splitNumber: 0, distance: 1000, duration: 320 },
    ]);

    expect(records[0].splitNumber).toBe(1);
    expect(records[1].splitNumber).toBe(2);
  });
});

describe('toSleepRecord', () => {
  const baseResponse = {
    id: 1,
    userProfilePK: 2,
    calendarDate: '2024-01-15',
    sleepTimeSeconds: 28800,
    napTimeSeconds: 0,
    sleepWindowConfirmed: true,
    deepSleepSeconds: 7200,
    lightSleepSeconds: 14400,
    remSleepSeconds: 7200,
    awakeSleepSeconds: 0,
  };

  it('uses the calendarDate from the response', () => {
    const record = toSleepRecord(baseResponse, '2024-01-16');

    expect(record?.calendarDate).toBe('2024-01-15');
    expect(record?.sleepTimeSeconds).toBe(28800);
  });

  it('falls back to the requested date when calendarDate is missing', () => {
    const record = toSleepRecord({ ...baseResponse, calendarDate: '' }, '2024-01-16');

    expect(record?.calendarDate).toBe('2024-01-16');
  });

  it('returns null when neither calendarDate nor requested date is available', () => {
    expect(toSleepRecord({ ...baseResponse, calendarDate: '' }, '')).toBeNull();
  });

  it('nulls out absent optional fields', () => {
    const record = toSleepRecord({ ...baseResponse, deepSleepSeconds: undefined }, '2024-01-15');

    expect(record?.deepSleepSeconds).toBeNull();
  });
});

describe('toHrvRecord', () => {
  const baseResponse = {
    userProfilePk: 1,
    hrvSummary: {
      calendarDate: '2024-01-15',
      weeklyAvg: 60.5,
      lastNightAvg: 55.2,
      lastNight5MinHigh: 65.8,
      baseline: { lowUpper: 40, balancedLow: 35, balancedUpper: 45, markerValue: 38.5 },
      status: 'balanced',
      feedbackPhrase: 'Your HRV is balanced.',
      createTimeStamp: '2024-01-15 17:00:00',
    },
    hrvReadings: [],
  };

  it('flattens the baseline object into individual fields', () => {
    const record = toHrvRecord(baseResponse);

    expect(record.calendarDate).toBe('2024-01-15');
    expect(record.baselineLowUpper).toBe(40);
    expect(record.baselineBalancedLow).toBe(35);
    expect(record.baselineMarkerValue).toBe(38.5);
  });

  it('falls back to the current time for missing timestamps', () => {
    const before = Date.now();
    const record = toHrvRecord({ ...baseResponse, hrvSummary: { ...baseResponse.hrvSummary, createTimeStamp: undefined } });
    const after = Date.now();

    expect(record.createTimeStamp.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(record.startTimestampGMT.getTime()).toBeLessThanOrEqual(after + 1000);
    expect(record.sleepStartTimestampGMT).toBeInstanceOf(Date);
  });

  it('parses provided timestamps', () => {
    const record = toHrvRecord({
      ...baseResponse,
      startTimestampGMT: '2024-01-15 00:00:00',
      endTimestampGMT: '2024-01-15 23:59:59',
      startTimestampLocal: '2024-01-15 00:00:00',
      endTimestampLocal: '2024-01-15 23:59:59',
      sleepStartTimestampGMT: '2024-01-15 23:00:00',
      sleepEndTimestampGMT: '2024-01-16 07:00:00',
      sleepStartTimestampLocal: '2024-01-15 23:00:00',
      sleepEndTimestampLocal: '2024-01-16 07:00:00',
    });

    expect(record.startTimestampGMT.toISOString()).toBe('2024-01-15T00:00:00.000Z');
    expect(record.sleepEndTimestampGMT.toISOString()).toBe('2024-01-16T07:00:00.000Z');
  });
});

describe('toHrvReadingRecords', () => {
  it('returns an empty array when there are no readings', () => {
    expect(toHrvReadingRecords('hrv-uuid')).toEqual([]);
    expect(toHrvReadingRecords('hrv-uuid', [])).toEqual([]);
  });

  it('keys readings by the stored hrv_data id and maps fields', () => {
    const records = toHrvReadingRecords('hrv-uuid', [
      { hrvValue: 42, readingTimeGMT: '2024-01-15 03:00:00', readingTimeLocal: '2024-01-15 03:00:00' },
    ]);

    expect(records).toHaveLength(1);
    expect(records[0].hrvDataId).toBe('hrv-uuid');
    expect(records[0].hrvValue).toBe(42);
    expect(records[0].readingTimeGMT.toISOString()).toBe('2024-01-15T03:00:00.000Z');
  });

  it('falls back to the current time for missing reading timestamps', () => {
    const records = toHrvReadingRecords('hrv-uuid', [{ hrvValue: 42 }]);

    expect(records[0].readingTimeGMT).toBeInstanceOf(Date);
  });
});

import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import settup from '../src/config/settup.json' with { type: 'json' };
import { generateUser, generateAdmin } from './generators.js';
import makeHelpers from '../src/utils/helpers.js';
import { parseISO } from 'date-fns';

const getUser = jest.fn();

const { isRotaAdmin, isUserInBranch, fillMissingDates } = makeHelpers({
  getUser
});

describe('isRotaAdmin', () => {
  let userId;
  let branch;
  let wrongBranch;

  beforeAll(() => {
    userId = 1230;
    branch = Object.keys(settup)[0];
    wrongBranch = Object.keys(settup)[1];
  });

  beforeEach(() => {
    getUser.mockClear();
  });

  it("should return true if 'admin_rota_' present for the specified branch", async () => {
    getUser.mockResolvedValueOnce(generateAdmin(branch, userId));
    const res = await isRotaAdmin(branch, userId);
    expect(res).toBe(true);
  });

  it('should return false if user not found', async () => {
    getUser.mockResolvedValueOnce(null);
    const res = await isRotaAdmin(branch, userId);
    expect(res).toBe(false);
  });

  it('should return false if only `rota_` permission is present', async () => {
    getUser.mockResolvedValueOnce(generateUser(branch, userId));
    const res = await isRotaAdmin(branch, userId);
    expect(res).toBe(false);
  });

  it('should return flase if `admin_rota_` permission is present for a different branch', async () => {
    getUser.mockResolvedValueOnce(generateAdmin(wrongBranch, userId));
    const res = await isRotaAdmin(branch, userId);
    expect(res).toBe(false);
  });

  it('should call `getUser` once', async () => {
    getUser.mockResolvedValueOnce(generateAdmin(branch, userId));
    const _res = await isRotaAdmin(branch, userId);
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenCalledWith(userId);
  });
});

describe('isUserInBranch', () => {
  let userId;
  let branch;
  let wrongBranch;

  beforeAll(() => {
    userId = 1230;
    branch = Object.keys(settup)[0];
    wrongBranch = Object.keys(settup)[1];
  });

  beforeEach(() => {
    getUser.mockClear();
  });

  it('should return true if user is in branch', async () => {
    getUser.mockResolvedValueOnce(generateUser(branch, userId));
    const res = await isUserInBranch(branch, userId);
    expect(res).toBe(true);
  });

  it('should return true for admins', async () => {
    getUser.mockResolvedValueOnce(generateAdmin(branch, userId));
    const res = await isUserInBranch(branch, userId);
    expect(res).toBe(true);
  });

  it('should return false if user is not found', async () => {
    getUser.mockResolvedValueOnce(null);
    const res = await isUserInBranch(branch, userId);
    expect(res).toBe(false);
  });

  it('should return false for user of a different branch', async () => {
    getUser.mockResolvedValueOnce(generateUser(wrongBranch, userId));
    const res = await isUserInBranch(branch, userId);
    expect(res).toBe(false);
  });

  it('should return false for admin of a different branch', async () => {
    getUser.mockResolvedValueOnce(generateAdmin(wrongBranch, userId));
    const res = await isUserInBranch(branch, userId);
    expect(res).toBe(false);
  });

  it('should call `getUser` once', async () => {
    getUser.mockResolvedValueOnce(generateUser(branch, userId));
    const _res = await isUserInBranch(branch, userId);
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenCalledWith(userId);
  });
});

describe('fillMissingDates', () => {
  it('fills missing dates between start and end using last known count', () => {
    const data = [
      { date: parseISO('2026-01-02'), count: 5 },
      { date: parseISO('2026-01-04'), count: 10 }
    ];
    const startDate = parseISO('2026-01-01');
    const endDate = parseISO('2026-01-05');

    const result = fillMissingDates(data, startDate, endDate);
    expect(result).toEqual([
      { date: '2026-01-01T00:00:00Z', count: 0 },
      { date: '2026-01-02T00:00:00Z', count: 5 },
      { date: '2026-01-03T00:00:00Z', count: 5 },
      { date: '2026-01-04T00:00:00Z', count: 10 },
      { date: '2026-01-05T00:00:00Z', count: 10 }
    ]);
  });

  it('fills dates before first data point with zero', () => {
    const data = [{ date: parseISO('2026-01-03'), count: 7 }];

    const startDate = parseISO('2026-01-01');
    const endDate = parseISO('2026-01-03');

    const result = fillMissingDates(data, startDate, endDate);

    expect(result).toEqual([
      { date: '2026-01-01T00:00:00Z', count: 0 },
      { date: '2026-01-02T00:00:00Z', count: 0 },
      { date: '2026-01-03T00:00:00Z', count: 7 }
    ]);
  });

  it('uses last known count after first data point', () => {
    const data = [
      { date: parseISO('2026-01-01'), count: 3 },
      { date: parseISO('2026-01-04'), count: 5 }
    ];

    const startDate = parseISO('2026-01-01');
    const endDate = parseISO('2026-01-06');

    const result = fillMissingDates(data, startDate, endDate);

    expect(result).toEqual([
      { date: '2026-01-01T00:00:00Z', count: 3 },
      { date: '2026-01-02T00:00:00Z', count: 3 },
      { date: '2026-01-03T00:00:00Z', count: 3 },
      { date: '2026-01-04T00:00:00Z', count: 5 },
      { date: '2026-01-05T00:00:00Z', count: 5 },
      { date: '2026-01-06T00:00:00Z', count: 5 }
    ]);
  });

  it('returns zeros for all dates when data is empty', () => {
    const data = [];

    const startDate = parseISO('2026-01-01');
    const endDate = parseISO('2026-01-03');

    const result = fillMissingDates(data, startDate, endDate);

    expect(result).toEqual([
      { date: '2026-01-01T00:00:00Z', count: 0 },
      { date: '2026-01-02T00:00:00Z', count: 0 },
      { date: '2026-01-03T00:00:00Z', count: 0 }
    ]);
  });

  it('handles single-day range correctly', () => {
    const data = [{ date: parseISO('2026-01-01'), count: 42 }];

    const startDate = parseISO('2026-01-01');
    const endDate = parseISO('2026-01-01');

    const result = fillMissingDates(data, startDate, endDate);

    expect(result).toEqual([{ date: '2026-01-01T00:00:00Z', count: 42 }]);
  });
});

import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import settup from '../src/config/settup.json' with { type: 'json' };
import { generateUser, generateAdmin } from './generators.js';
import makeHelpers from '../src/utils/helpers.js';

const getUser = jest.fn();

const { isRotaAdmin } = makeHelpers({
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
    const res = await isRotaAdmin(branch, userId);
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenCalledWith(userId);
  });
});

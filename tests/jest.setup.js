import { jest } from '@jest/globals';

jest.unstable_mockModule('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next()
}));

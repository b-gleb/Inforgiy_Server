import { jest } from '@jest/globals';

jest.unstable_mockModule('express-rate-limit', () => ({
  default: () => (req, res, next) => next()
}));

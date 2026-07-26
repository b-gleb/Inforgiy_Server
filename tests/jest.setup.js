// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { jest } from '@jest/globals';

jest.unstable_mockModule('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next()
}));

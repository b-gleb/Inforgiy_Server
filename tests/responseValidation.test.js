import settup from '../src/config/settup.json' with { type: 'json' };
import { validateBranch, validateUserId, validateColor, validateDateRange, validateTimeRange } from '../src/utils/responseValidation.js';

describe('validateBranch', () => {
  it('should accept branches from settup keys', () => {
    for (const branch of Object.keys(settup)){
      const {error, value} = validateBranch.validate(branch);
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
    }
  });

  it('should reject invalid branch', () => {
    const {error} = validateBranch.validate('invalid_branch');
    expect(error).toBeDefined();
  });
});


describe('validateUserId', () => {
  it('should accept positive integer values', () => {
    const {error, value} = validateUserId.validate(490770242);
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
  });

  it('should accept positive integers as strings', () => {
    const {error, value} = validateUserId.validate('490770242');
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
    expect(typeof value).toBe('number');
  });

  it('should reject alpha-numerical combinations', () => {
    const {error} = validateUserId.validate('12a56b');
    expect(error).toBeDefined();
  });

  it('should reject zero', () => {
    const {error} = validateUserId.validate(0);
    expect(error).toBeDefined();
  });

  it('should reject non integers', () => {
    const {error} = validateUserId.validate(123.5);
    expect(error).toBeDefined();
  });

  it('should reject negative numbers', () => {
    const {error} = validateUserId.validate(-1);
    expect(error).toBeDefined();
  });
});


describe('validateColor', () => {
  it('should accept a valid color integer', () => {
    const {error, value} = validateColor.validate(2);
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
  });

  it('should accept a valid color integer as string', () => {
    const {error, value} = validateColor.validate('2');
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
    expect(typeof value).toBe('number');
  });

  it('should accept an empty parameter and return a zero', () => {
    const {error, value} = validateColor.validate();
    expect(error).toBeUndefined();
    expect(value).toBe(0);
    expect(typeof value).toBe('number');
  });

  it('should accept zero', () => {
    const {error, value} = validateColor.validate(0);
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
  });

  it('should reject 7 and above', () => {
    const {error} = validateColor.validate(7);
    expect(error).toBeDefined();
  });

  it('should reject non integer values', () => {
    const {error} = validateColor.validate(2.5);
    expect(error).toBeDefined();
  });

  it('should reject negative values', () => {
    const {error} = validateColor.validate(-2);
    expect(error).toBeDefined();
  });
});


describe('validateDateRange', () => {
  it('should accept an array of 2 dates in format YYYY-MM-DD', () => {
    const {error, value} = validateDateRange.validate(['2025-01-01', '2025-01-31']);
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
  });

  it('should reject an array of 2 dates in format YYYY-MM-DD where 1st date is larger', () => {
    const {error} = validateDateRange.validate(['2025-01-31', '2025-01-01']);
    expect(error).toBeDefined();
  });

  it('should reject an array of 1 dates in format YYYY-MM-DD', () => {
    const {error} = validateDateRange.validate(['2025-01-01']);
    expect(error).toBeDefined();
  });

  it('should reject an array of 3 dates in format YYYY-MM-DD', () => {
    const {error} = validateDateRange.validate(['2025-01-01', '2025-02-01', '2025-03-01']);
    expect(error).toBeDefined();
  });

  it('should reject an array of 2 dates in format DD-MM-YYYY', () => {
    const {error} = validateDateRange.validate(['01-01-2025', '31-01-2025']);
    expect(error).toBeDefined();
  });

  it('should reject an array of 2 dates in format YYYY.MM.DD', () => {
    const {error} = validateDateRange.validate(['2025.01.01', '2025.01.31']);
    expect(error).toBeDefined();
  });

  it('should reject an array of 2 dates in format YYYY-MM-DD with DD above 31', () => {
    const {error} = validateDateRange.validate(['2025-01-01', '2025-01-33']);
    expect(error).toBeDefined();
  });

  it('should reject an array of 2 strings', () => {
    const {error} = validateDateRange.validate(['some text', 'other text']);
    expect(error).toBeDefined();
  });
});

describe('validateTimeRange', () => {
it('should accept a string of format ^\d{2}:\d{2}-\d{2}:\d{2}$', () => {
  const {error, value} = validateTimeRange.validate('00:00-01:00');
  expect(error).toBeUndefined();
  expect(value).toBeDefined();
});

it('should reject a string of desired format if the first 2 digits >= 24', () => {
  const {error} = validateTimeRange.validate('24:00-25:00');
  expect(error).toBeDefined();
});

it('should reject an intiger', () => {
  const {error} = validateTimeRange.validate(5);
  expect(error).toBeDefined();
});

it('should reject a string not matching the format ', () => {
  const {error} = validateTimeRange.validate('some string');
  expect(error).toBeDefined();
});
});
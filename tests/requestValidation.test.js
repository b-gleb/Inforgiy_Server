// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { jest } from '@jest/globals';
import settup from '../src/config/settup.json' with { type: 'json' };
import {
  validateBranch,
  validateColor,
  validateDateRange,
  validateDayOfWeek,
  validateDayOfWeekArray,
  validateStartDateBeforeEndDate,
  validateTimeRange,
  validateTimeRangeArray,
  validateUserId
} from '../src/utils/responseValidation.js';

describe('validateBranch', () => {
  it('should accept branches from settup keys', () => {
    for (const branch of Object.keys(settup)) {
      const { error, value } = validateBranch.validate(branch);
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
    }
  });

  it('should reject invalid branch', () => {
    const { error } = validateBranch.validate('invalid_branch');
    expect(error).toBeDefined();
  });
});

describe('validateUserId', () => {
  it('should accept positive integer values', () => {
    const { error, value } = validateUserId.validate(490770242);
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
  });

  it('should accept positive integers as strings', () => {
    const { error, value } = validateUserId.validate('490770242');
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
    expect(typeof value).toBe('number');
  });

  it('should reject alpha-numerical combinations', () => {
    const { error } = validateUserId.validate('12a56b');
    expect(error).toBeDefined();
  });

  it('should reject zero', () => {
    const { error } = validateUserId.validate(0);
    expect(error).toBeDefined();
  });

  it('should reject non integers', () => {
    const { error } = validateUserId.validate(123.5);
    expect(error).toBeDefined();
  });

  it('should reject negative numbers', () => {
    const { error } = validateUserId.validate(-1);
    expect(error).toBeDefined();
  });
});

describe('validateColor', () => {
  it('should accept a valid color integer', () => {
    const { error, value } = validateColor.validate(2);
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
  });

  it('should accept a valid color integer as string', () => {
    const { error, value } = validateColor.validate('2');
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
    expect(typeof value).toBe('number');
  });

  it('should accept an empty parameter and return a zero', () => {
    const { error, value } = validateColor.validate();
    expect(error).toBeUndefined();
    expect(value).toBe(0);
    expect(typeof value).toBe('number');
  });

  it('should accept zero', () => {
    const { error, value } = validateColor.validate(0);
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
  });

  it('should reject 7 and above', () => {
    const { error } = validateColor.validate(7);
    expect(error).toBeDefined();
  });

  it('should reject non integer values', () => {
    const { error } = validateColor.validate(2.5);
    expect(error).toBeDefined();
  });

  it('should reject negative values', () => {
    const { error } = validateColor.validate(-2);
    expect(error).toBeDefined();
  });

  it('should reject an alpha-numerical string', () => {
    const { error } = validateColor.validate('test1');
    expect(error).toBeDefined();
  });
});

describe('validateDayOfWeek', () => {
  it('should accept numbers 0-6 (inclusive)', () => {
    const array = [0, 1, 2, 3, 4, 5, 6];

    for (const item in array) {
      const { error, value } = validateDayOfWeek.validate(item);
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
      expect(typeof value).toBe('number');
    }
  });

  it('should accept numbers 0-6 (inclusive) as strings', () => {
    const array = ['0', '1', '2', '3', '4', '5', '6'];

    for (const item in array) {
      const { error, value } = validateDayOfWeek.validate(item);
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
      expect(typeof value).toBe('number');
    }
  });

  it('should reject 7 and above', () => {
    const { error } = validateDayOfWeek.validate(7);
    expect(error).toBeDefined();
  });

  it('should reject negative values', () => {
    const { error } = validateDayOfWeek.validate(-1);
    expect(error).toBeDefined();
  });

  it('should reject non integer values', () => {
    const { error } = validateDayOfWeek.validate(2.5);
    expect(error).toBeDefined();
  });
});

describe('validateDayOfWeekArray', () => {
  it('should accept a array of length 1', () => {
    const { error, value } = validateDayOfWeekArray.validate(new Array(1).fill(0));
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
  });

  it('should accept an array of length 7', () => {
    const { error, value } = validateDayOfWeekArray.validate(new Array(7).fill(0));
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
  });

  it('should reject an array of length 8', () => {
    const { error } = validateDayOfWeekArray.validate(new Array(8).fill(0));
    expect(error).toBeDefined();
  });

  it('should reject an empty array', () => {
    const { error } = validateDayOfWeekArray.validate([]);
    expect(error).toBeDefined();
  });

  it('should reject a string', () => {
    const { error } = validateDayOfWeekArray.validate('string');
    expect(error).toBeDefined();
  });

  it('should reject a number', () => {
    const { error } = validateDayOfWeekArray.validate(1);
    expect(error).toBeDefined();
  });

  it('should reject an object', () => {
    const { error } = validateDayOfWeekArray.validate({});
    expect(error).toBeDefined();
  });
});

describe('validateTimeRange', () => {
  it('should accept a string of format hh:mm-hh:mm (regular rota)', () => {
    const { error, value } = validateTimeRange.validate('00:00-01:00');
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
  });

  it('should accept a string of format hh:mm<space>-<space>hh:mm (weekly view)', () => {
    const { error, value } = validateTimeRange.validate('00:00 - 01:00');
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
  });

  it('should reject a string of desired format if the first 2 digits >= 24', () => {
    const { error } = validateTimeRange.validate('24:00-25:00');
    expect(error).toBeDefined();
  });

  it('should reject an intiger', () => {
    const { error } = validateTimeRange.validate(5);
    expect(error).toBeDefined();
  });

  it('should reject a string not matching the format ', () => {
    const { error } = validateTimeRange.validate('some string');
    expect(error).toBeDefined();
  });
});

describe('validateTimeRangeArray', () => {
  it('should accept a array of length 1', () => {
    const { error, value } = validateTimeRangeArray.validate(
      new Array(1).fill('00:00-01:00')
    );
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
  });

  it('should accept an array of length 24', () => {
    const { error, value } = validateTimeRangeArray.validate(
      new Array(24).fill('00:00-01:00')
    );
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
  });

  it('should reject an array of length 25', () => {
    const { error } = validateTimeRangeArray.validate(new Array(25).fill('00:00-01:00'));
    expect(error).toBeDefined();
  });

  it('should reject an empty array', () => {
    const { error } = validateTimeRangeArray.validate([]);
    expect(error).toBeDefined();
  });

  it('should reject a string', () => {
    const { error } = validateTimeRangeArray.validate('string');
    expect(error).toBeDefined();
  });

  it('should reject a number', () => {
    const { error } = validateTimeRangeArray.validate(1);
    expect(error).toBeDefined();
  });

  it('should reject an object', () => {
    const { error } = validateTimeRangeArray.validate({});
    expect(error).toBeDefined();
  });
});

describe('validateDateRange', () => {
  it('should accept an array of 2 dates in format YYYY-MM-DD', () => {
    const { error, value } = validateDateRange.validate(['2025-01-01', '2025-01-31']);
    expect(error).toBeUndefined();
    expect(value).toBeDefined();
  });

  it('should reject an array of 2 dates in format YYYY-MM-DD where 1st date is larger', () => {
    const { error } = validateDateRange.validate(['2025-01-31', '2025-01-01']);
    expect(error).toBeDefined();
  });

  it('should reject an array of 1 dates in format YYYY-MM-DD', () => {
    const { error } = validateDateRange.validate(['2025-01-01']);
    expect(error).toBeDefined();
  });

  it('should reject an array of 3 dates in format YYYY-MM-DD', () => {
    const { error } = validateDateRange.validate([
      '2025-01-01',
      '2025-02-01',
      '2025-03-01'
    ]);
    expect(error).toBeDefined();
  });

  it('should reject an array of 2 dates in format DD-MM-YYYY', () => {
    const { error } = validateDateRange.validate(['01-01-2025', '31-01-2025']);
    expect(error).toBeDefined();
  });

  it('should reject an array of 2 dates in format YYYY.MM.DD', () => {
    const { error } = validateDateRange.validate(['2025.01.01', '2025.01.31']);
    expect(error).toBeDefined();
  });

  it('should reject an array of 2 dates in format YYYY-MM-DD with DD above 31', () => {
    const { error } = validateDateRange.validate(['2025-01-01', '2025-01-33']);
    expect(error).toBeDefined();
  });

  it('should reject an array of 2 strings', () => {
    const { error } = validateDateRange.validate(['some text', 'other text']);
    expect(error).toBeDefined();
  });
});

describe('validateStartDateBeforeEndDate', () => {
  let helpers;
  let errorMessage;

  beforeAll(() => {
    helpers = {
      message: jest.fn(msg => ({ error: msg }))
    };

    errorMessage = 'startDate must be less than endDate';
  });

  it('should accept startDate before endDate', () => {
    const value = {
      startDate: new Date(2025, 0, 1),
      endDate: new Date(2025, 1, 1)
    };

    const result = validateStartDateBeforeEndDate(value, helpers);
    expect(result).toBe(value);
  });

  it('shoud reject endDate before startDate', () => {
    const value = {
      startDate: new Date(2025, 1, 1),
      endDate: new Date(2025, 0, 1)
    };

    const _result = validateStartDateBeforeEndDate(value, helpers);
    expect(helpers.message).toHaveBeenCalledWith(errorMessage);
  });

  it('should reject startDate equals endDate', () => {
    const value = {
      startDate: new Date(2025, 1, 1),
      endDate: new Date(2025, 1, 1)
    };

    const _result = validateStartDateBeforeEndDate(value, helpers);
    expect(helpers.message).toHaveBeenCalledWith(errorMessage);
  });
});

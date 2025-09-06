import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import settup from '../../src/config/settup.json' with { type: 'json' };
const makeApp = (await import('../../src/app.js')).default;


function generateDateRangeStats (userIds) {
  return userIds.map(id => ({
    _id: id,
    count: Math.floor(Math.random() * 30) + 1
  }));
};

function generateEmptyDutiesStats (dateRanges) {
  return dateRanges.reduce((acc, range, idx) => {
    acc[`range_${idx}`] = [{
      count: Math.floor(Math.random() * 30) + 1,
    }];
    return acc;
  }, {});
};

function generateTakenDutiesStats (dateRanges) {
  return dateRanges.reduce((acc, range, idx) => {
    acc[`range_${idx}`] = [{
      count: Math.floor(Math.random() * 30) + 1,
    }];
    return acc;
  }, {});
};

function generateUniqueUsersStats (dateRanges) {
  return dateRanges.reduce((acc, range, idx) => {
    acc[`range_${idx}`] = [{
      count: Math.floor(Math.random() * 30) + 1,
    }];
    return acc;
  }, {});
};

function generateUser (branch, id) {
  return ({
    telegram: `@username_${id}`,
    roles: {
      [`rota_${branch}`]: {
        nick: `Nick_${id}`,
        c: 0
      }
    }
  });
};

const getEmptyDuties = jest.fn();
const getTakenDuties = jest.fn();
const getUniqueUsers = jest.fn();
const getDateRangeStats = jest.fn();
const getUser = jest.fn();

const app = makeApp({
  getDateRangeStats,
  getUser,
  getEmptyDuties,
  getTakenDuties,
  getUniqueUsers,
});


describe('POST /api/stats', () => {
  beforeEach(() => {
    getDateRangeStats.mockReset();
    getUser.mockReset();
  });

  describe('INVALID PARAMETERS POST /api/stats', () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      const bodyData = [
        {userIds: [1230], dateRanges: [['2025-01-01', '2025-01-31']]},
        {branch: Object.keys(settup)[0], dateRanges: [['2025-01-01', '2025-01-31']]},
        {branch: Object.keys(settup)[0], userIds: [1230]},
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).post('/api/stats').send(body);
        expect(res.statusCode).toBe(400);
      };
    });


    it('should respond with status code 400 if userIds is a valid id (not array of ids)', async () => {
      const res = await request(app).post('/api/stats').send({
        branch: Object.keys(settup)[0],
        userIds: 1230,
        dateRanges: [['2025-01-01', '2025-01-31']]
      });
      
      expect(res.statusCode).toBe(400);
    });


    it('should respond with status code 400 if dateRanges is a valid date range (not array of date ranges)', async () => {
      const res = await request(app).post('/api/stats').send({
        branch: Object.keys(settup)[0],
        userIds: [1230],
        dateRanges: ['2025-01-01', '2025-01-31']
      });
      
      expect(res.statusCode).toBe(400);
    });
  });


  describe('VALID PARAMETERS POST /api/stats', () => {
    it('should return status code 200', async () => {
      const branch = Object.keys(settup)[0];
      const userIds = [1230, 4560];

      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const res = await request(app).post('/api/stats').send({
        branch,
        userIds,
        dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28']]
      });

      expect(res.statusCode).toBe(200);
    });


    it('should return status code 404 when requested user does not exist', async () => {
      const branch = Object.keys(settup)[0];

      getUser.mockResolvedValue(null);
      getDateRangeStats.mockResolvedValue([]);

      const res = await request(app).post('/api/stats').send({
        branch,
        userIds: [1],
        dateRanges: [['2025-01-01', '2025-01-31']]
      });

      expect(res.statusCode).toBe(404);
    });


    it('should specify json in the content type header', async () => {
      const branch = Object.keys(settup)[0];
      const userIds = [1230, 4560];

      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const res = await request(app).post('/api/stats').send({
        branch,
        userIds,
        dateRanges: [['2025-01-01', '2025-01-31']]
      });

      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });


    it('should call function `getDateRangeStats` the same number of times as length of "dateRanges"', async () => {
      const branch = Object.keys(settup)[0];
      const userIds = [1230, 4560];

      const bodyData = [
        {branch, userIds, dateRanges: [['2025-01-01', '2025-01-31']]},
        {branch, userIds, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28']]},
        {branch, userIds, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28'], ['2025-03-01', '2025-03-31']]},
      ];

      for (const body of bodyData) {
        getUser.mockReset();
        getDateRangeStats.mockReset();

        getUser.mockResolvedValue(generateUser(branch, 1230));
        getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

        const res = await request(app).post('/api/stats').send(body);

        expect(getDateRangeStats.mock.calls.length).toBe(body['dateRanges'].length);
        expect(getDateRangeStats.mock.calls[0][0]).toBe(branch);
        expect(getDateRangeStats.mock.calls[0][1]).toStrictEqual(userIds);
      };
    });
  });


  describe('RESPONSE VALIDATION POST /api/stats', () => {
    const branch = Object.keys(settup)[0]
    const userIds = [1230, 4560]
    const dateRanges = [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28']]

    it('should return an array of objects', async () => {
      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const res = await request(app).post('/api/stats').send({branch, userIds, dateRanges});

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.every(item => typeof item === 'object' && item !== null)).toBe(true);
    });


    it('length of array should be the length of requested `userIds`', async () => {
      getUser.mockResolvedValue(generateUser(branch, 1230));

      const bodyData = [
        {branch, dateRanges, userIds: [1230]},
        {branch, dateRanges, userIds: [1230, 4560]},
        {branch, dateRanges, userIds: [1230, 4560, 7890]}
      ];

      for (const body of bodyData) {
        getDateRangeStats.mockResolvedValue(generateDateRangeStats(body['userIds']));

        const res = await request(app).post('/api/stats').send(body);
        expect(res.body.length).toBe(body['userIds'].length);
      };
    });


    it('array elements should have properties "user" and "data"', async () => {
      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const res = await request(app).post('/api/stats').send({branch, userIds, dateRanges});

      const expectedProps = ['user', 'data'];
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps.sort());
      });

      expect(allHaveExpectedProps).toBe(true);
    });


    it('array element "user" should be of type object', async () => {
      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const res = await request(app).post('/api/stats').send({branch, userIds, dateRanges});

      expect(res.body.every(item => typeof item.user === 'object' && item.user != null)).toBe(true);
    });


    it('array element "user" should have properties "id", "nick", "color"', async () => {
      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const res = await request(app).post('/api/stats').send({branch, userIds, dateRanges});

      const expectedProps = ['id', 'nick', 'color'];
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item.user).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps.sort());
      }) 

      expect(allHaveExpectedProps).toBe(true);
    });


    it('property "id" of type "user" object should be of a positive integer', async () => {
      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const res = await request(app).post('/api/stats').send({branch, userIds, dateRanges});

      expect(res.body.every(item => Number.isInteger(item.user.id) && item.user.id > 0)).toBe(true);
    });


    it('property "nick" of type "user" object should be a string', async () => {
      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const res = await request(app).post('/api/stats').send({branch, userIds, dateRanges});

      expect(res.body.every(item => typeof item.user.nick === 'string')).toBe(true);
    });


    it('property "color" of type "user" object should be a positive integer or zero', async () => {
      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const res = await request(app).post('/api/stats').send({branch, userIds, dateRanges});

      expect(res.body.every(item => Number.isInteger(item.user.color) && item.user.color >= 0)).toBe(true);
    });


    it('array element "data" should be of type array', async () => {
      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const res = await request(app).post('/api/stats').send({branch, userIds, dateRanges});

      expect(res.body.every(item => Array.isArray(item.data))).toBe(true);
    });


    it('array element "data" should have be the length of requested `dataRanges`', async () => {
      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const bodyData = [
        {branch, userIds, dateRanges: [['2025-01-01', '2025-01-31']]},
        {branch, userIds, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28']]},
        {branch, userIds, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28'], ['2025-03-01', '2025-03-31']]},
      ];

      for (const body of bodyData) {
        const res = await request(app).post('/api/stats').send(body);
        expect(res.body.every(item => item.data.length === body['dateRanges'].length));
      };
    });


    it('"data" array element should be of type object', async () => {
      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const res = await request(app).post('/api/stats').send({branch, userIds, dateRanges});

      expect(res.body.every(
        item => item.data.every(
          subitem => typeof subitem === 'object' && subitem != null
        )
      )).toBe(true);
    });


    it('"data" array element should have properties "dateRange" and "count"', async () => {
      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const res = await request(app).post('/api/stats').send({branch, userIds, dateRanges});

      const expectedProps = ['dateRange', 'count'];
      const allHaveExpectedProps = res.body.every(
        item => item.data.every(subitem => {
          const actualProps = Object.keys(subitem).sort();
          return JSON.stringify(actualProps) === JSON.stringify(expectedProps.sort());
      }));

      expect(allHaveExpectedProps).toBe(true);
    });


    it('"dateRange" property to be of type array of length 2', async () => {
      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const res = await request(app).post('/api/stats').send({branch, userIds, dateRanges});

      expect(res.body.every(
        item => item.data.every(
          subitem => Array.isArray(subitem.dateRange) && subitem.dateRange.length == 2
        )
      )).toBe(true);
    });


    it('"count" property to be of type integer', async () => {
      getUser.mockResolvedValue(generateUser(branch, 1230));
      getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));

      const res = await request(app).post('/api/stats').send({branch, userIds, dateRanges});

      expect(res.body.every(
        item => item.data.every(
          subitem => typeof Number.isInteger(subitem.count) && subitem.count >= 0
        )
      )).toBe(true);
    });
  });
});


describe('POST /api/stats/emptyDuties', () => {
  let branch;
  let dateRanges;
  let validBody;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    dateRanges = [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28']];
    validBody = {branch, dateRanges};

    getEmptyDuties.mockResolvedValue(generateEmptyDutiesStats(dateRanges));
  });

  beforeEach(() => {
    getEmptyDuties.mockClear();
  });

  describe('INVALID PARAMETERS POST /api/stats/emptyDuties', () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      const bodyData = [
        {branch},
        {dateRanges},
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).post('/api/stats/emptyDuties').send(body);
        expect(res.statusCode).toBe(400);
      };
    });


    it('should respond with status code 400 if dateRanges is a valid date range (not array of date ranges)', async () => {
      const res = await request(app).post('/api/stats/emptyDuties').send({branch, dateRanges: ['2025-01-01', '2025-01-31']});
      expect(res.statusCode).toBe(400);
    });
  });



  describe('VALID PARAMETERS POST /api/stats/emptyDuties', () => {
    it('should return status code 200', async () => {
      const res = await request(app).post('/api/stats/emptyDuties').send(validBody);
      expect(res.statusCode).toBe(200);
    });


    it('should specify json in the content type header', async () => {
      const res = await request(app).post('/api/stats/emptyDuties').send(validBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });


    it('should call `getEmptyDuties` once', async () => {
      const bodyData = [
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31']]},
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28']]},
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28'], ['2025-03-01', '2025-03-31']]}
      ];

      for (const body of bodyData) {
        getEmptyDuties.mockClear();
        getEmptyDuties.mockResolvedValueOnce(generateEmptyDutiesStats(body.dateRanges));

        const res = await request(app).post('/api/stats/emptyDuties').send(body);

        expect(getEmptyDuties).toHaveBeenCalledTimes(1);
        expect(getEmptyDuties).toHaveBeenCalledWith(body.branch, body.dateRanges);
      };
    });
  });



  describe('RESPONSE VALIDATION POST /api/stats/emptyDuties', () => {
    it('should return an array of objects', async () => {
      const res = await request(app).post('/api/stats/emptyDuties').send(validBody);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.every(item => typeof item === 'object' && item !== null)).toBe(true);
    });


    it('length of array should be the length of requested dateRanges', async () => {
      const bodyData = [
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31']]},
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28']]},
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28'], ['2025-03-01', '2025-03-31']]}
      ];

      for (const body of bodyData) {
        getEmptyDuties.mockClear();
        getEmptyDuties.mockResolvedValueOnce(generateEmptyDutiesStats(body.dateRanges));

        const res = await request(app).post('/api/stats/emptyDuties').send(body);
        expect(res.body.length).toBe(body.dateRanges.length);
      };
    });


    it('array elements should have properties "dateRange" and "count"', async () => {
      const res = await request(app).post('/api/stats/emptyDuties').send(validBody);
      
      const expectedProps = ['dateRange', 'count'].sort();
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps);
      });

      expect(allHaveExpectedProps).toBe(true);
    });


    it('"dateRange" should be an array of length 2', async () => {
      const res = await request(app).post('/api/stats/emptyDuties').send(validBody);
      expect(res.body.every(item => Array.isArray(item.dateRange) && item.dateRange.length === 2)).toBe(true);
    });


    it('"dateRange" elements should be date strings', async () => {
      const res = await request(app).post('/api/stats/emptyDuties').send(validBody);

      const allDatesMatchFormat = res.body.every(
        item => item.dateRange.every(
          range => /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(range)
        )
      );

      expect(res.body.every(
        item => item.dateRange.every(
          range => typeof range === 'string'
        )
      )).toBe(true);
      expect(allDatesMatchFormat).toBe(true);
    });


    it('"count" should be an integer', async () => {
      const res = await request(app).post('/api/stats/emptyDuties').send(validBody);
      expect(res.body.every(item => Number.isInteger(item.count))).toBe(true);
    });
  });
});


describe('POST /api/stats/takenDuties', () => {
  let branch;
  let dateRanges;
  let validBody;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    dateRanges = [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28']];
    validBody = {branch, dateRanges};

    getTakenDuties.mockResolvedValue(generateTakenDutiesStats(dateRanges));
  });

  beforeEach(() => {
    getTakenDuties.mockClear();
  });

  describe('INVALID PARAMETERS POST /api/stats/takenDuties', () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      const bodyData = [
        {branch},
        {dateRanges},
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).post('/api/stats/takenDuties').send(body);
        expect(res.statusCode).toBe(400);
      };
    });


    it('should respond with status code 400 if dateRanges is a valid date range (not array of date ranges)', async () => {
      const res = await request(app).post('/api/stats/takenDuties').send({branch, dateRanges: ['2025-01-01', '2025-01-31']});
      expect(res.statusCode).toBe(400);
    });
  });



  describe('VALID PARAMETERS POST /api/stats/takenDuties', () => {
    it('should return status code 200', async () => {
      const res = await request(app).post('/api/stats/takenDuties').send(validBody);
      expect(res.statusCode).toBe(200);
    });


    it('should specify json in the content type header', async () => {
      const res = await request(app).post('/api/stats/takenDuties').send(validBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });


    it('should call `getTakenDuties` once', async () => {
      const bodyData = [
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31']]},
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28']]},
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28'], ['2025-03-01', '2025-03-31']]}
      ];

      for (const body of bodyData) {
        getTakenDuties.mockClear();
        getTakenDuties.mockResolvedValueOnce(generateTakenDutiesStats(body.dateRanges));

        const res = await request(app).post('/api/stats/takenDuties').send(body);

        expect(getTakenDuties).toHaveBeenCalledTimes(1);
        expect(getTakenDuties).toHaveBeenCalledWith(body.branch, body.dateRanges);
      };
    });
  });



  describe('RESPONSE VALIDATION POST /api/stats/takenDuties', () => {
    it('should return an array of objects', async () => {
      const res = await request(app).post('/api/stats/takenDuties').send(validBody);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.every(item => typeof item === 'object' && item !== null)).toBe(true);
    });


    it('length of array should be the length of requested dateRanges', async () => {
      const bodyData = [
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31']]},
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28']]},
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28'], ['2025-03-01', '2025-03-31']]}
      ];

      for (const body of bodyData) {
        getTakenDuties.mockClear();
        getTakenDuties.mockResolvedValueOnce(generateTakenDutiesStats(body.dateRanges));

        const res = await request(app).post('/api/stats/takenDuties').send(body);
        expect(res.body.length).toBe(body.dateRanges.length);
      };
    });


    it('array elements should have properties "dateRange" and "count"', async () => {
      const res = await request(app).post('/api/stats/takenDuties').send(validBody);
      
      const expectedProps = ['dateRange', 'count'].sort();
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps);
      });

      expect(allHaveExpectedProps).toBe(true);
    });


    it('"dateRange" should be an array of length 2', async () => {
      const res = await request(app).post('/api/stats/takenDuties').send(validBody);
      expect(res.body.every(item => Array.isArray(item.dateRange) && item.dateRange.length === 2)).toBe(true);
    });


    it('"dateRange" elements should be date strings', async () => {
      const res = await request(app).post('/api/stats/takenDuties').send(validBody);

      const allDatesMatchFormat = res.body.every(
        item => item.dateRange.every(
          range => /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(range)
        )
      );

      expect(res.body.every(
        item => item.dateRange.every(
          range => typeof range === 'string'
        )
      )).toBe(true);
      expect(allDatesMatchFormat).toBe(true);
    });


    it('"count" should be an integer', async () => {
      const res = await request(app).post('/api/stats/takenDuties').send(validBody);
      expect(res.body.every(item => Number.isInteger(item.count))).toBe(true);
    });
  });
});


describe('POST /api/stats/uniqueUsers', () => {
  let branch;
  let dateRanges;
  let validBody;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    dateRanges = [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28']];
    validBody = {branch, dateRanges};

    getUniqueUsers.mockResolvedValue(generateUniqueUsersStats(dateRanges));
  });

  beforeEach(() => {
    getUniqueUsers.mockClear();
  });

  describe('INVALID PARAMETERS POST /api/stats/uniqueUsers', () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      const bodyData = [
        {branch},
        {dateRanges},
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).post('/api/stats/uniqueUsers').send(body);
        expect(res.statusCode).toBe(400);
      };
    });


    it('should respond with status code 400 if dateRanges is a valid date range (not array of date ranges)', async () => {
      const res = await request(app).post('/api/stats/uniqueUsers').send({branch, dateRanges: ['2025-01-01', '2025-01-31']});
      expect(res.statusCode).toBe(400);
    });
  });



  describe('VALID PARAMETERS POST /api/stats/uniqueUsers', () => {
    it('should return status code 200', async () => {
      const res = await request(app).post('/api/stats/uniqueUsers').send(validBody);
      expect(res.statusCode).toBe(200);
    });


    it('should specify json in the content type header', async () => {
      const res = await request(app).post('/api/stats/uniqueUsers').send(validBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });


    it('should call `getUniqueUsers` once', async () => {
      const bodyData = [
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31']]},
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28']]},
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28'], ['2025-03-01', '2025-03-31']]}
      ];

      for (const body of bodyData) {
        getUniqueUsers.mockClear();
        getUniqueUsers.mockResolvedValueOnce(generateUniqueUsersStats(body.dateRanges));

        const res = await request(app).post('/api/stats/uniqueUsers').send(body);

        expect(getUniqueUsers).toHaveBeenCalledTimes(1);
        expect(getUniqueUsers).toHaveBeenCalledWith(body.branch, body.dateRanges);
      };
    });
  });



  describe('RESPONSE VALIDATION POST /api/stats/uniqueUsers', () => {
    it('should return an array of objects', async () => {
      const res = await request(app).post('/api/stats/uniqueUsers').send(validBody);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.every(item => typeof item === 'object' && item !== null)).toBe(true);
    });


    it('length of array should be the length of requested dateRanges', async () => {
      const bodyData = [
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31']]},
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28']]},
        {...validBody, dateRanges: [['2025-01-01', '2025-01-31'], ['2025-02-01', '2025-02-28'], ['2025-03-01', '2025-03-31']]}
      ];

      for (const body of bodyData) {
        getUniqueUsers.mockClear();
        getUniqueUsers.mockResolvedValueOnce(generateUniqueUsersStats(body.dateRanges));

        const res = await request(app).post('/api/stats/uniqueUsers').send(body);
        expect(res.body.length).toBe(body.dateRanges.length);
      };
    });


    it('array elements should have properties "dateRange" and "count"', async () => {
      const res = await request(app).post('/api/stats/uniqueUsers').send(validBody);
      
      const expectedProps = ['dateRange', 'count'].sort();
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps);
      });

      expect(allHaveExpectedProps).toBe(true);
    });


    it('"dateRange" should be an array of length 2', async () => {
      const res = await request(app).post('/api/stats/uniqueUsers').send(validBody);
      expect(res.body.every(item => Array.isArray(item.dateRange) && item.dateRange.length === 2)).toBe(true);
    });


    it('"dateRange" elements should be date strings', async () => {
      const res = await request(app).post('/api/stats/uniqueUsers').send(validBody);

      const allDatesMatchFormat = res.body.every(
        item => item.dateRange.every(
          range => /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(range)
        )
      );

      expect(res.body.every(
        item => item.dateRange.every(
          range => typeof range === 'string'
        )
      )).toBe(true);
      expect(allDatesMatchFormat).toBe(true);
    });


    it('"count" should be an integer', async () => {
      const res = await request(app).post('/api/stats/uniqueUsers').send(validBody);
      expect(res.body.every(item => Number.isInteger(item.count))).toBe(true);
    });
  });
});
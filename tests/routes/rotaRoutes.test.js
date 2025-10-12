import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import { lastDayOfYear, format } from "date-fns";
import settup from '../../src/config/settup.json' with { type: 'json' };

jest.unstable_mockModule('../src/utils/initDataValidation.js', () => ({
  validateInitData: jest.fn()
}));
const {validateInitData} = await import('../../src/utils/initDataValidation.js');

const makeApp = (await import('../../src/app.js')).default;

const getRota = jest.fn();
const getUserDuties = jest.fn();
const removeUserFromRota = jest.fn();
const addUserToRota = jest.fn();
const getUser = jest.fn();

const app = makeApp({
  getRota,
  getUserDuties,
  removeUserFromRota,
  addUserToRota,
  getUser
});

const rotaDBEntry = {
  "_id": "676d7f9f8300f637d426cee9",
  "date": new Date(2025, 2, 9),
  "rota": [
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [1813610409],
    [1171875915, 1813610409],
    [1171875915, 1813610409],
    [1171875915],
    [1171875915],
    [1171875915],
    [1171875915],
    [573769247],
    [573769247],
    [573769247],
    [573769247],
    [573769247],
    [573769247]
  ]
}


describe('GET /api/rota', () => {
  let branch;
  let date;
  let validBody;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    date = format(lastDayOfYear(new Date()), 'yyyy-MM-dd');
    validBody = {branch, date};

    getRota.mockResolvedValue({});
  });


  beforeEach(() => {
    getRota.mockClear();
  });

  describe('INVALID PARAMETERS GET /api/rota', () => {
    it('should respond with a status code 400 when any parameter is missing', async () => {
      const bodyData = [
        {branch},
        {date},
        {}
      ];

      for (const body of bodyData){
        const res = await request(app).get('/api/rota').query(body);
        expect(res.statusCode).toBe(400);
      };
    });
  });


  describe('VALID PARAMETERS GET /api/rota', () => {
    it('should respond with a status code of 200', async () => {
      const res = await request(app).get('/api/rota').query(validBody);
      expect(res.statusCode).toBe(200);
    });


    it('should respond with a status code of 404 if date is not found', async () => {
      getRota.mockResolvedValueOnce(null);
      const res = await request(app).get('/api/rota').query({
        branch,
        date: '1990-01-01'
      });

      expect(res.statusCode).toBe(404);
    });


    it('should specify json in the content type header', async () => {
      const res = await request(app).get('/api/rota').query(validBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

  
    it('should query the database for day rota', async () => {
      const res = await request(app).get('/api/rota').query(validBody);
      expect(getRota).toHaveBeenCalledTimes(1);
      expect(getRota).toHaveBeenCalledWith(branch, new Date(date));
    });
  });


  describe.each(Object.keys(settup))('RESPONSE VALIDATION GET /api/rota for branch %s', (branch) => {
    it('response should be an array of length 24', async () => {
      const res = await request(app).get('/api/rota').query(validBody);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(24);
    });


    it('array elements should have properties "users" and "label"', async () => {
      const res = await request(app).get('/api/rota').query(validBody);

      const expectedProps = ['users', 'label'].sort();
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps);
      });

      expect(allHaveExpectedProps).toBe(true);
    });


    it('array element "users" should be of type object', async () => {
      const res = await request(app).get('/api/rota').query(validBody);
      expect(res.body.every(item => typeof item.users === 'object' && item.users != null)).toBe(true);
    });


    it('array element property "label" should be of type string', async () => {
      const res = await request(app).get('/api/rota').query(validBody);
      expect(res.body.every(item => typeof item.label === 'string')).toBe(true);
    });
  });
});




describe('GET /api/userDuties', () => {
  let branch;
  let validBody;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    validBody = {
      branch,
      userId: 1813610409,
      startDate: '2025-01-01',
      endDate: '2025-01-08'
    };

    getUserDuties.mockResolvedValue([rotaDBEntry]);
  });


  beforeEach(() => {
    getUserDuties.mockClear();
  });

  describe('INVALID PARAMETRS GET /api/userDuties', () => {
    it('should respond with a status code 400 when any parameter is missing', async () => {
      const bodyData = [
        {userId: 1230, startDate: '2025-01-01', endDate: '2025-01-08'},
        {branch, startDate: '2025-01-01', endDate: '2025-01-08'},
        {branch, userId: 1230, endDate: '2025-01-08'},
        {branch, userId: 1230, startDate: '2025-01-01'},
        {}
      ];

      for (const body of bodyData){
        const res = await request(app).get('/api/userDuties').query(body);
        expect(res.statusCode).toBe(400);
      };
    });


    it('should respond with a status code 400 when startDate is larger than endDate', async () => {
      const res = await request(app).get('/api/userDuties').query({branch, userId: 1230, startDate: '2025-01-08', endDate: '2025-01-01'});
      expect(res.statusCode).toBe(400);
    });
  });


  describe('VALID PARAMETERS GET /api/userDuties', () => {
    it('should respond with status code 200', async () => {
      const res = await request(app).get('/api/userDuties').query(validBody);
      expect(res.statusCode).toBe(200);
    });


    it('should specify json in the content type header', async () => {
      const res = await request(app).get('/api/userDuties').query(validBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

  
    it('should query the database for user duties', async () => {
      const res = await request(app).get('/api/userDuties').query({branch: 'di', userId: 12345, startDate: '2026-01-01', endDate: '2026-01-08'});
      expect(getUserDuties).toHaveBeenCalledTimes(1);
      expect(getUserDuties).toHaveBeenCalledWith('di', 12345, new Date('2026-01-01'), new Date('2026-01-08'));
    });
  });


  describe('RESPONSE VALIDATION GET /api/userDuties', () => {
    it('should return an empty array if no duties are found', async () => {
      getUserDuties.mockResolvedValueOnce([]);
      const res = await request(app).get('/api/userDuties').query(validBody);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(0);
    });


    it('should return an array of objects if any duties are found', async () => {
      const res = await request(app).get('/api/userDuties').query(validBody);
      expect(res.body.every(item => typeof item === 'object' && item != null));
    });


    it('array element should have properties "date" and "hours"', async () => {
      const res = await request(app).get('/api/userDuties').query(validBody);

      const expectedProps = ['date', 'hours'];
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps.sort());
      });
      
      expect(allHaveExpectedProps).toBe(true);
    });


    it('array element property "date" should be of type date', async () => {
      const res = await request(app).get('/api/userDuties').query(validBody);

      const allDatesMatchFormat = res.body.every(item =>
        /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(item.date)
      );
      
      expect(res.body.every(item => typeof item.date === 'string')).toBe(true);
      expect(allDatesMatchFormat).toBe(true);
    });


    it('array element property "hours" should be of type array', async () => {
      const res = await request(app).get('/api/userDuties').query(validBody);
      expect(res.body.every(item => Array.isArray(item.hours))).toBe(true);
    });


    it('array element property "hours" should not be empty', async () => {
      const res = await request(app).get('/api/userDuties').query(validBody);
      expect(res.body.every(item => item.hours.length != 0)).toBe(true);
    });


    it('array element property "hours" should contain integers', async () => {
      const res = await request(app).get('/api/userDuties').query(validBody);

      expect(res.body.every(item => 
        item.hours.every(hour => 
          Number.isInteger(hour)
        )
      )).toBe(true);
    });
  });
});





describe('POST /api/updateRota', () => {
  let branch;
  let date;
  let initDataUnsafe;
  let validBody;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    date = format(new Date(), 'yyyy-MM-dd');
    initDataUnsafe = {user: {id: 1813610409}};
    validBody = {
      branch,
      date,
      modifyUserId: 1813610409,
      timeRange: '05:00-06:00',
      initDataUnsafe
    };

    validateInitData.mockReturnValue(true);
    getUser.mockResolvedValue({telegram: '@username', roles: {[`admin_rota_${branch}`]: null}});
    getRota.mockResolvedValue(rotaDBEntry);
    removeUserFromRota.mockResolvedValue(rotaDBEntry);
    addUserToRota.mockResolvedValue(rotaDBEntry);
  });

  beforeEach(() => {
    getRota.mockClear();
    removeUserFromRota.mockClear();
    addUserToRota.mockClear();
    validateInitData.mockClear();
    getUser.mockClear();
  });

  describe('INVALID PARAMETERS POST /api/updateRota', () => {
    it('should respond with status code 400 when any parameter is missing', async () => {
      const bodyData = [
        {branch, date, timeRange: '00:00-01:00', modifyUserId: 4560, initDataUnsafe},
        {type: 'add', date, timeRange: '00:00-01:00', modifyUserId: 4560, initDataUnsafe},
        {type: 'add', branch, timeRange: '00:00-01:00', modifyUserId: 4560, initDataUnsafe},
        {type: 'add', branch, date, modifyUserId: 4560, initDataUnsafe},
        {type: 'add', branch, date, timeRange: '00:00-01:00', initDataUnsafe},
        {type: 'add', branch, date, timeRange: '00:00-01:00', modifyUserId: 4560},
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).post('/api/updateRota').send(body);
        expect(res.statusCode).toBe(400);
      };
    });
  });


  describe('VALID PARAMETERS POST /api/updateRota', () => {
    describe.each(['add', 'remove'])('Using type "%s" to modify rota', (type) => {
      it('should respond with status code 200', async () => {
        const res = await request(app).post('/api/updateRota').send({type, ...validBody});
        expect(res.statusCode).toBe(200);
      });


      it('should respond with status code 401 if unable to verify hash', async () => {
        validateInitData.mockReturnValueOnce(false);
        const res = await request(app).post('/api/updateRota').send({type, ...validBody});
        expect(res.statusCode).toBe(401);
      });


      it('should respond with status code 404 if trying to modify date which does not exist', async () => {
        getRota.mockResolvedValueOnce(null);
        const res = await request(app).post('/api/updateRota').send({type, ...validBody});
        expect(res.statusCode).toBe(404);
      });


      it('should specify json in the content type header', async () => {
        const res = await request(app).post('/api/updateRota').send({type, ...validBody});
        expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
      });
    });


    describe('Adding a user to rota', () => {
      it('should respond with status code 403 if non admin user tries to add not themselves to rota', async () => {
        getUser.mockResolvedValueOnce(null);
        const res = await request(app).post('/api/updateRota').send({...validBody, type: 'add', modifyUserId: 1230});
        expect(res.statusCode).toBe(403);
        expect(getUser).toHaveBeenCalledTimes(1);
      });


      it('should respond with status code 200 if non admin user trues to add themselves to rota', async () => {
        getUser.mockResolvedValueOnce({telegram: '@username', roles: {}});
        const res = await request(app).post('/api/updateRota').send({type: 'add', ...validBody});
        expect(res.statusCode).toBe(200);
      });


      it('should call addUserToRota() when adding a user to rota', async () => {
        const res = await request(app).post('/api/updateRota').send({type: 'add', ...validBody});
        expect(addUserToRota).toHaveBeenCalledTimes(1);
        expect(removeUserFromRota).toHaveBeenCalledTimes(0);
        expect(addUserToRota).toHaveBeenCalledWith(branch, '676d7f9f8300f637d426cee9', 5, [1813610409]);
      });
    });


    describe('Removing a user from rota', () => {
      it('should respond with status code 403 if non admin user tries to remove any user from rota', async () => {
        getUser.mockResolvedValueOnce({telegram: '@username', roles: {}});
        const res = await request(app).post('/api/updateRota').send({type: 'remove', ...validBody});
        expect(res.statusCode).toBe(403);
      });


      it('should call removeUserFromRota() when removing user from rota', async () => {
        const res = await request(app).post('/api/updateRota').send({type: 'remove', ...validBody});
        expect(removeUserFromRota).toHaveBeenCalledTimes(1);
        expect(addUserToRota).toHaveBeenCalledTimes(0);
        expect(removeUserFromRota).toHaveBeenCalledWith(branch, '676d7f9f8300f637d426cee9', 5, 1813610409);
      });
    });
  });


  describe.each(['add', 'remove'])('RESPONSE VALIDATION POST /api/updateRota for type "%s"' , (type) => {
    it('response should be an array of length 24', async () => {
      const res = await request(app).post('/api/updateRota').send({type, ...validBody});
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(24);
    });


    it('array elements should have properties "users" and "label"', async () => {
      const res = await request(app).post('/api/updateRota').send({type, ...validBody});

      const expectedProps = ['users', 'label'];
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps.sort());
      });

      expect(allHaveExpectedProps).toBe(true);
    });


    it('array element "users" should be of type object', async () => {
      const res = await request(app).post('/api/updateRota').send({type, ...validBody});
      expect(res.body.every(item => typeof item.users === 'object' && item.users != null)).toBe(true);
    });


    it('array element property "label" should be of type string', async () => {
      const res = await request(app).post('/api/updateRota').send({type, ...validBody});
      expect(res.body.every(item => typeof item.label === 'string')).toBe(true);
    });
  });
});

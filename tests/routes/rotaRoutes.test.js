import { beforeEach, describe, expect, jest } from '@jest/globals';
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
  beforeEach(() => {
    getRota.mockReset();
  });

  describe('INVALID PARAMETERS GET /api/rota', () => {
    it('should respond with a status code 400 when any parameter is missing', async () => {
      const bodyData = [
        {branch: Object.keys(settup)[0]},
        {date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')},
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
      const res = await request(app).get('/api/rota').query({
        branch: 'lns',
        date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
      });

      expect(res.statusCode).toBe(200);
    });


    it('should respond with a status code of 404 if date is not found', async () => {
      getRota.mockResolvedValue(null);
      const res = await request(app).get('/api/rota').query({
        branch: 'lns',
        date: '1990-01-01'
      });

      expect(res.statusCode).toBe(404);
    });


    it('should specify json in the content type header', async () => {
      const res = await request(app).get('/api/rota').query({
        branch: 'lns',
        date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
      });

      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

  
    it('should query the database for day rota', async () => {
      const res = await request(app).get('/api/rota').query({
        branch: 'lns',
        date: '2025-01-01'
      });

      expect(getRota.mock.calls.length).toBe(1);
      expect(getRota.mock.calls[0][0]).toBe('lns');
      expect(getRota.mock.calls[0][1].toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });
  });


  describe.each(Object.keys(settup))('RESPONSE VALIDATION GET /api/rota for branch %s', (branch) => {
    it('response should be an array of length 24', async () => {
      getRota.mockResolvedValue({});

      const res = await request(app).get('/api/rota').query({
        branch: branch,
        date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
      });

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(24);
    });


    it('array elements should have properties "users" and "label"', async () => {
      getRota.mockResolvedValue({});

      const res = await request(app).get('/api/rota').query({
        branch: branch,
        date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
      });

      const expectedProps = ['users', 'label'];
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps.sort());
      });

      expect(allHaveExpectedProps).toBe(true);
    });


    it('array element "users" should be of type object', async () => {
      getRota.mockResolvedValue({});

      const res = await request(app).get('/api/rota').query({
        branch: branch,
        date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
      });

      expect(res.body.every(item => typeof item.users === 'object' && item.users != null)).toBe(true);
    });


    it('array element property "label" should be of type string', async () => {
      getRota.mockResolvedValue({});

      const res = await request(app).get('/api/rota').query({
        branch: branch,
        date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
      });

      expect(res.body.every(item => typeof item.label === 'string')).toBe(true);
    });
  });
});





describe('GET /api/userDuties', () => {
  beforeEach(() => {
    getUserDuties.mockReset();
  });

  describe('INVALID PARAMETRS GET /api/userDuties', () => {
    it('should respond with a status code 400 when any parameter is missing', async () => {
      const bodyData = [
        {userId: 1230, startDate: '2025-01-01', endDate: '2025-01-08'},
        {branch: Object.keys(settup)[0], startDate: '2025-01-01', endDate: '2025-01-08'},
        {branch: Object.keys(settup)[0], userId: 1230, endDate: '2025-01-08'},
        {branch: Object.keys(settup)[0], userId: 1230, startDate: '2025-01-01'},
        {}
      ];

      for (const body of bodyData){
        const res = await request(app).get('/api/userDuties').query(body);
        expect(res.statusCode).toBe(400);
      };
      
    });


    it('should respond with a status code 400 when startDate is larger than endDate', async () => {
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1230, startDate: '2025-01-08', endDate: '2025-01-01'});

      expect(res.statusCode).toBe(400);
    });
  });


  describe('VALID PARAMETERS GET /api/userDuties', () => {
    it('should respond with status code 200', async () => {
      getUserDuties.mockResolvedValue([]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1230, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(res.statusCode).toBe(200);
    });


    it('should specify json in the content type header', async () => {
      getUserDuties.mockResolvedValue([]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1230, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

  
    it('should query the database for user duties', async () => {
      getUserDuties.mockResolvedValue([]);
      const res = await request(app).get('/api/userDuties').query({branch: 'di', userId: 12345, startDate: '2026-01-01', endDate: '2026-01-08'});

      expect(getUserDuties.mock.calls.length).toBe(1);
      expect(getUserDuties.mock.calls[0][0]).toBe('di');
      expect(getUserDuties.mock.calls[0][1]).toBe(12345);
      expect(getUserDuties.mock.calls[0][2].toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(getUserDuties.mock.calls[0][3].toISOString()).toBe('2026-01-08T00:00:00.000Z');
    });
  });


  describe('RESPONSE VALIDATION GET /api/userDuties', () => {
    it('should return an empty array if no duties are found', async () => {
      getUserDuties.mockResolvedValue([]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1230, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(0);
    });


    it('should return an array of objects if any duties are found', async () => {
      getUserDuties.mockResolvedValue([rotaDBEntry]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1813610409, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(res.body.every(item => typeof item === 'object' && item != null));
    });


    it('array element should have properties "date" and "hours"', async () => {
      getUserDuties.mockResolvedValue([rotaDBEntry]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1813610409, startDate: '2025-01-01', endDate: '2025-01-08'});

      const expectedProps = ['date', 'hours'];
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps.sort());
      });
      
      expect(allHaveExpectedProps).toBe(true);
    });


    it('array element property "date" should be of type date', async () => {
      getUserDuties.mockResolvedValue([rotaDBEntry]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1813610409, startDate: '2025-01-01', endDate: '2025-01-08'});

      const allDatesMatchFormat = res.body.every(item =>
        /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(item.date)
      );
      
      expect(res.body.every(item => typeof item.date === 'string')).toBe(true);
      expect(allDatesMatchFormat).toBe(true);
    });


    it('array element property "hours" should be of type array', async () => {
      getUserDuties.mockResolvedValue([rotaDBEntry]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1813610409, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(res.body.every(item => Array.isArray(item.hours))).toBe(true);
    });


    it('array element property "hours" should not be empty', async () => {
      getUserDuties.mockResolvedValue([rotaDBEntry]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1813610409, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(res.body.every(item => item.hours.length != 0)).toBe(true);
    });


    it('array element property "hours" should contain integers', async () => {
      getUserDuties.mockResolvedValue([rotaDBEntry]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1813610409, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(res.body.every(item => 
        item.hours.every(hour => 
          Number.isInteger(hour)
        )
      )).toBe(true);
    });
  });
});





describe('POST /api/updateRota', () => {
  describe('INVALID PARAMETERS POST /api/updateRota', () => {
    it('should respond with status code 400 when any parameter is missing', async () => {
      const bodyData = [
        {branch: Object.keys(settup), date: format(new Date(), 'yyyy-MM-dd'), timeRange: '00:00-01:00', modifyUserId: 1230, initDataUnsafe: {}},
        {type: 'add', date: format(new Date(), 'yyyy-MM-dd'), timeRange: '00:00-01:00', modifyUserId: 1230, initDataUnsafe: {}},
        {type: 'add', branch: Object.keys(settup), timeRange: '00:00-01:00', modifyUserId: 1230, initDataUnsafe: {}},
        {type: 'add', branch: Object.keys(settup), date: format(new Date(), 'yyyy-MM-dd'), modifyUserId: 1230, initDataUnsafe: {}},
        {type: 'add', branch: Object.keys(settup), date: format(new Date(), 'yyyy-MM-dd'), timeRange: '00:00-01:00', initDataUnsafe: {}},
        {type: 'add', branch: Object.keys(settup), date: format(new Date(), 'yyyy-MM-dd'), timeRange: '00:00-01:00', modifyUserId: 1230},
        {}
      ];

      for (const body of bodyData){
        const res = await request(app).post('/api/updateRota').send(body);
        expect(res.statusCode).toBe(400);
      };
    });
  });


  describe('VALID PARAMETERS POST /api/updateRota', () => {
    beforeEach(() => {
      getRota.mockReset();
      removeUserFromRota.mockReset();
      addUserToRota.mockReset();
      validateInitData.mockReset();
      getUser.mockReset();
    });

    describe.each(['add', 'remove'])('Using type "%s" to modify rota', (type) => {
      it('should respond with status code 200', async () => {
        const branch = Object.keys(settup)[0];

        validateInitData.mockReturnValue(true);
        getUser.mockResolvedValue({telegram: '@username', roles: {[`admin_rota_${branch}`]: null}});
        getRota.mockResolvedValue(rotaDBEntry);
        removeUserFromRota.mockResolvedValue(rotaDBEntry);
        addUserToRota.mockResolvedValue(rotaDBEntry);

        const res = await request(app).post('/api/updateRota').send({
          type: type,
          branch: branch,
          date: format(new Date(), 'yyyy-MM-dd'),
          modifyUserId: 1813610409,
          timeRange: '00:00-01:00',
          initDataUnsafe: {user: {id: 1813610409}}
        });

        expect(res.statusCode).toBe(200);
      });


      it('should respond with status code 401 if unable to verify hash', async () => {
        const branch = Object.keys(settup)[0];

        validateInitData.mockReturnValue(false);
        getUser.mockResolvedValue({telegram: '@username', roles: {[`admin_rota_${branch}`]: null}});

        const res = await request(app).post('/api/updateRota').send({
          type: type,
          branch: branch,
          date: format(new Date(), 'yyyy-MM-dd'),
          modifyUserId: 1230,
          timeRange: '00:00-01:00',
          initDataUnsafe: {user: {id: 1230}}
        });

        expect(res.statusCode).toBe(401);
      });


      it('should respond with status code 404 if trying to modify date which does not exist', async () => {
        const branch = Object.keys(settup)[0];

        validateInitData.mockReturnValue(true);
        getUser.mockResolvedValue({telegram: '@username', roles: {[`admin_rota_${branch}`]: null}});
        getRota.mockResolvedValue(null);

        const res = await request(app).post('/api/updateRota').send({
          type: type,
          branch: branch,
          date: '1990-01-01',
          modifyUserId: 1230,
          timeRange: '00:00-01:00',
          initDataUnsafe: {user: {id: 1230}}
        });

        expect(res.statusCode).toBe(404);
      });


      it('should specify json in the content type header', async () => {
        const branch = Object.keys(settup)[0];

        validateInitData.mockReturnValue(true);
        getUser.mockResolvedValue({telegram: '@username', roles: {[`admin_rota_${branch}`]: null}});
        getRota.mockResolvedValue(rotaDBEntry);
        removeUserFromRota.mockResolvedValue(rotaDBEntry);
        addUserToRota.mockResolvedValue(rotaDBEntry);

        const res = await request(app).post('/api/updateRota').send({
          type: type,
          branch: branch,
          date: format(new Date(), 'yyyy-MM-dd'),
          modifyUserId: 1230,
          timeRange: '00:00-01:00',
          initDataUnsafe: {user: {id: 1230}}
        });

        expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
      });
    });


    describe('Adding a user to rota', () => {
      it('should respond with status code 403 if non admin user tries to add not themselves to rota', async () => {
        const branch = Object.keys(settup)[0];

        validateInitData.mockReturnValue(true);
        getUser.mockResolvedValue(null);
        getRota.mockResolvedValue(rotaDBEntry);
        removeUserFromRota.mockResolvedValue(rotaDBEntry);
        addUserToRota.mockResolvedValue(rotaDBEntry);

        const res = await request(app).post('/api/updateRota').send({
          type: 'add',
          branch: branch,
          date: format(new Date(), 'yyyy-MM-dd'),
          modifyUserId: 1230,
          timeRange: '00:00-01:00',
          initDataUnsafe: {user: {id: 1813610409}}
        });

        expect(res.statusCode).toBe(403);
        expect(getUser.mock.calls.length).toBe(1);
      });


      it('should respond with status code 200 if non admin user trues to add themselves to rota', async () => {
        validateInitData.mockReturnValue(true);
        getUser.mockResolvedValue({telegram: '@username', roles: {}});
        getRota.mockResolvedValue(rotaDBEntry);
        removeUserFromRota.mockResolvedValue(rotaDBEntry);
        addUserToRota.mockResolvedValue(rotaDBEntry);

        const res = await request(app).post('/api/updateRota').send({
          type: 'add',
          branch: Object.keys(settup)[0],
          date: format(new Date(), 'yyyy-MM-dd'),
          modifyUserId: 1813610409,
          timeRange: '00:00-01:00',
          initDataUnsafe: {user: {id: 1813610409}}
        });

        expect(res.statusCode).toBe(200);
      });


      it('should call addUserToRota() when adding a user to rota', async () => {
        const branch = 'lns';

        validateInitData.mockReturnValue(true);
        getUser.mockResolvedValue({telegram: '@username', roles: {[`admin_rota_${branch}`]: null}});
        getRota.mockResolvedValue(rotaDBEntry);
        removeUserFromRota.mockResolvedValue(rotaDBEntry);
        addUserToRota.mockResolvedValue(rotaDBEntry);

        const res = await request(app).post('/api/updateRota').send({
          type: 'add',
          branch: branch,
          date: '2025-01-04',
          modifyUserId: 1230,
          timeRange: '05:00-06:00',
          initDataUnsafe: {user: {id: 1813610409}}
        });

        expect(addUserToRota.mock.calls.length).toBe(1);
        expect(removeUserFromRota.mock.calls.length).toBe(0);
        expect(addUserToRota.mock.calls[0][0]).toBe('lns');
        expect(addUserToRota.mock.calls[0][1]).toBe('676d7f9f8300f637d426cee9');
        expect(addUserToRota.mock.calls[0][2]).toBe(5);
      });
    });


    describe('Removing a user from rota', () => {
      it('should respond with status code 403 if non admin user tries to remove any user from rota', async () => {
        validateInitData.mockReturnValue(true);
        getUser.mockResolvedValue({telegram: '@username', roles: {}});
        getRota.mockResolvedValue(rotaDBEntry);
        removeUserFromRota.mockResolvedValue(rotaDBEntry);
        addUserToRota.mockResolvedValue(rotaDBEntry);

        const res = await request(app).post('/api/updateRota').send({
          type: 'remove',
          branch: 'lns',
          date: '2025-01-04',
          modifyUserId: 1813610409,
          timeRange: '05:00-06:00',
          initDataUnsafe: {user: {id: 1813610409}}
        });

        expect(res.statusCode).toBe(403);
      });


      it('should call removeUserFromRota() when removing user from rota', async () => {
        const branch = 'lns';
        validateInitData.mockReturnValue(true);
        getUser.mockResolvedValue({telegram: '@username', roles: {[`admin_rota_${branch}`]: null}});
        getRota.mockResolvedValue(rotaDBEntry);
        removeUserFromRota.mockResolvedValue(rotaDBEntry);
        addUserToRota.mockResolvedValue(rotaDBEntry);

        const res = await request(app).post('/api/updateRota').send({
          type: 'remove',
          branch: branch,
          date: '2025-01-04',
          modifyUserId: 1230,
          timeRange: '05:00-06:00',
          initDataUnsafe: {user: {id: 1813610409}}
        });

        expect(removeUserFromRota.mock.calls.length).toBe(1);
        expect(addUserToRota.mock.calls.length).toBe(0);
        expect(removeUserFromRota.mock.calls[0][0]).toBe('lns');
        expect(removeUserFromRota.mock.calls[0][1]).toBe('676d7f9f8300f637d426cee9');
        expect(removeUserFromRota.mock.calls[0][2]).toBe(5);
        expect(removeUserFromRota.mock.calls[0][3]).toBe(1230);
      });
    });
  });


  describe.each(['add', 'remove'])('RESPONSE VALIDATION POST /api/updateRota for type "%s"' , (type) => {
    it('response should be an array of length 24', async () => {
      const branch = Object.keys(settup)[0];

      validateInitData.mockReturnValue(true);
      getUser.mockResolvedValue({telegram: '@username', roles: {[`admin_rota_${branch}`]: null}});
      getRota.mockResolvedValue(rotaDBEntry);
      removeUserFromRota.mockResolvedValue(rotaDBEntry);
      addUserToRota.mockResolvedValue(rotaDBEntry);

      const res = await request(app).post('/api/updateRota').send({
        type: type,
        branch: branch,
        date: format(new Date(), 'yyyy-MM-dd'),
        modifyUserId: 1813610409,
        timeRange: '00:00-01:00',
        initDataUnsafe: {user: {id: 1813610409}}
        });

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(24);
    });


    it('array elements should have properties "users" and "label"', async () => {
      const branch = Object.keys(settup)[0];

      validateInitData.mockReturnValue(true);
      getUser.mockResolvedValue({telegram: '@username', roles: {[`admin_rota_${branch}`]: null}});
      getRota.mockResolvedValue(rotaDBEntry);
      removeUserFromRota.mockResolvedValue(rotaDBEntry);
      addUserToRota.mockResolvedValue(rotaDBEntry);

      const res = await request(app).post('/api/updateRota').send({
        type: type,
        branch: branch,
        date: format(new Date(), 'yyyy-MM-dd'),
        modifyUserId: 1813610409,
        timeRange: '00:00-01:00',
        initDataUnsafe: {user: {id: 1813610409}}
      });

      const expectedProps = ['users', 'label'];
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps.sort());
      });

      expect(allHaveExpectedProps).toBe(true);
    });


    it('array element "users" should be of type object', async () => {
      const branch = Object.keys(settup)[0];

      validateInitData.mockReturnValue(true);
      getUser.mockResolvedValue({telegram: '@username', roles: {[`admin_rota_${branch}`]: null}});
      getRota.mockResolvedValue(rotaDBEntry);
      removeUserFromRota.mockResolvedValue(rotaDBEntry);
      addUserToRota.mockResolvedValue(rotaDBEntry);

      const res = await request(app).post('/api/updateRota').send({
        type: type,
        branch: branch,
        date: format(new Date(), 'yyyy-MM-dd'),
        modifyUserId: 1813610409,
        timeRange: '00:00-01:00',
        initDataUnsafe: {user: {id: 1813610409}}
        });

      expect(res.body.every(item => typeof item.users === 'object' && item.users != null)).toBe(true);
    });


    it('array element property "label" should be of type string', async () => {
      const branch = Object.keys(settup)[0];

      validateInitData.mockReturnValue(true);
      getUser.mockResolvedValue({telegram: '@username', roles: {[`admin_rota_${branch}`]: null}});
      getRota.mockResolvedValue(rotaDBEntry);
      removeUserFromRota.mockResolvedValue(rotaDBEntry);
      addUserToRota.mockResolvedValue(rotaDBEntry);

      const res = await request(app).post('/api/updateRota').send({
        type: type,
        branch: branch,
        date: format(new Date(), 'yyyy-MM-dd'),
        modifyUserId: 1813610409,
        timeRange: '00:00-01:00',
        initDataUnsafe: {user: {id: 1813610409}}
        });

      expect(res.body.every(item => typeof item.label === 'string')).toBe(true);
    });
  });
});

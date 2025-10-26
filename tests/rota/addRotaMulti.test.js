import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';

const apiUrl = '/api/addRotaMulti';

describe(`POST ${apiUrl}`, () => {
  describe(`INVALID PARAMETERS POST ${apiUrl}`, () => {
    // should respond with status code 400 when any of the parameters are missing
  });

  describe(`VALID PARAMETERS POST ${apiUrl}`, () => {
    // should respond with status code 200

    // should respond with status code 401 if unable to verify hash

    // should respond with status code 403 if non admin calls the endpoint

    // should respond with status code 404 if unable to find user

    // should specify json in the content type header

    // should call `getUser` once if non admin calls the endpoint

    // should call `getUser` twice (to check calling user and the user to add to rota)

    // TODO: Add test which checks that the DB function has been called
  });

  describe(`RESPONSE VALIDATION POST ${apiUrl}`, () => {
    
  });
});
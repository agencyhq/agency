import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

import { operationsApi } from '../api';
import { Storage } from '../store';
import fixtures from './__fixtures__/operations';

describe('api', () => {
  describe('operationsApi', () => {
    let app: express.Express;
    let storage: Storage;

    beforeEach(() => {
      jest.resetAllMocks();
      storage = new Storage();

      storage.loadOperations(fixtures);

      app = express();
      app.use(express.json());
    });

    it('should return operations', async () => {
      operationsApi(app, storage);

      await request(app)
        .get('/operations')
        .expect(200)
        .then((response) => {
          response.body.forEach((operation: any) => {
            expect(operation).toMatchSnapshot({
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            });
          });
        });
    });

    it('should return operation', async () => {
      operationsApi(app, storage);

      await request(app)
        .get('/operations/1')
        .expect(200)
        .then((response) => {
          expect(response.body).toMatchSnapshot({
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          });
        });
    });

    it('should create operation', async () => {
      operationsApi(app, storage);

      await request(app)
        .post('/operations')
        .send({ action: 'create', params: { name: 'John Doe' } })
        .expect(200)
        .then((response) => {
          expect(response.body).toMatchSnapshot({
            id: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          });
        })
        .catch((err) => {
          console.log(err);
          throw err;
        });
    });

    it('should update operation', async () => {
      operationsApi(app, storage);

      await request(app)
        .put(`/operations/1`)
        .send({ action: 'update', params: { name: 'Jane Doe' } })
        .expect(200)
        .then((response) => {
          expect(response.body).toMatchSnapshot({
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          });
        });
    });

    it('should delete operation', async () => {
      operationsApi(app, storage);

      await request(app)
        .delete('/operations/1')
        .expect(200)
        .then((response) => {
          expect(response.body).toMatchSnapshot();
        });
    });

    it('should return 404 on non-existent operation', async () => {
      operationsApi(app, storage);

      await request(app)
        .get('/operations/5')
        .expect(404)
        .then((response) => {
          expect(response.body).toMatchSnapshot();
        });
    });

    it('should claim operation', async () => {
      operationsApi(app, storage);

      await request(app)
        .post('/operations/3/claim')
        .expect(200)
        .then((response) => {
          expect(response.body).toMatchSnapshot({
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          });
        });
    });

    it('should return 404 on non-existent operation claim', async () => {
      operationsApi(app, storage);

      await request(app)
        .post('/operations/5/claim')
        .expect(404)
        .then((response) => {
          expect(response.body).toMatchSnapshot();
        });
    });

    it('shoult return 400 on already claimed operation', async () => {
      operationsApi(app, storage);

      await request(app)
        .post('/operations/2/claim')
        .expect(400)
        .then((response) => {
          expect(response.body).toMatchSnapshot();
        });
    });

    it('should return result of operation', async () => {
      operationsApi(app, storage);

      await request(app)
        .get('/operations/1/result')
        .expect(200)
        .then((response) => {
          expect(response.body).toMatchSnapshot();
        });
    });

    it('should return 404 on non-existent operation result', async () => {
      operationsApi(app, storage);

      await request(app)
        .get('/operations/5/result')
        .expect(404)
        .then((response) => {
          expect(response.body).toMatchSnapshot();
        });
    });

    it('should return status of operation', async () => {
      operationsApi(app, storage);

      await request(app)
        .get('/operations/1/status')
        .expect(200)
        .then((response) => {
          expect(response.body).toMatchSnapshot();
        });
    });

    it('should return 404 on non-existent operation status', async () => {
      operationsApi(app, storage);

      await request(app)
        .get('/operations/5/status')
        .expect(404)
        .then((response) => {
          expect(response.body).toMatchSnapshot();
        });
    });

    it('should post status of operation', async () => {
      operationsApi(app, storage);

      await request(app)
        .post('/operations/2/status')
        .send({ status: 'processing' })
        .expect(200)
        .then((response) => {
          expect(response.body).toMatchSnapshot({
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          });
        });
    });

    it('should return 404 on non-existent operation status post', async () => {
      operationsApi(app, storage);

      await request(app)
        .post('/operations/5/status')
        .send({ status: 'processing' })
        .expect(404)
        .then((response) => {
          expect(response.body).toMatchSnapshot();
        });
    });

    it('should return 400 on invalid status operation is in', async () => {
      operationsApi(app, storage);

      await request(app)
        .post('/operations/1/status')
        .send({ status: 'failed' })
        .expect(400)
        .then((response) => {
          expect(response.body).toMatchSnapshot();
        });
    });

    it('should return 400 on invalid status operation should transition to', async () => {
      operationsApi(app, storage);

      await request(app)
        .post('/operations/2/status')
        .send({ status: 'requested' })
        .expect(400)
        .then((response) => {
          expect(response.body).toMatchSnapshot();
        });
    });
    
  });
});

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { Operation } from '../models/operation';
import { Storage } from '../store';

export function operationsApi(app: Router, storage: Storage) {
  /**
   * Operations
   *
   * GET /operations
   * GET /operations/:id
   * POST /operations
   * PUT /operations/:id
   * DELETE /operations/:id
   * GET /operations/:id/result
   *
   * @example
   * $ curl -X GET http://localhost:3000/operations
   */
  app.get('/operations', (req, res) => {
    const operations: Operation[] = storage.getOperations();

    res.json(operations);
  });

  /**
   * @example
   * $ curl -X GET http://localhost:3000/operations/1
   */
  app.get('/operations/:id', (req, res) => {
    const id = req.params.id;
    const operation: Operation = storage.getOperation(id);

    if (!operation) {
      res.status(404).send('Operation not found');
      return;
    }

    res.json(operation);
  });

  /**
   * @example
   * $ curl -X POST http://localhost:3000/operations \
   *  -H "Content-Type: application/json" \
   *  -d '{"action":"create","params":{"name":"John Doe"}}'
   */
  app.post('/operations', (req, res) => {
    const operation: Operation = req.body;
    const id = uuidv4();

    operation.id = id;
    operation.status = 'requested';
    operation.createdAt = new Date();
    operation.updatedAt = new Date();

    storage.createOperation(operation);

    res.json(operation);
  });

  /**
   * @example
   * $ curl -X PUT http://localhost:3000/operations/1 \
   *   -H "Content-Type: application/json" \
   *   -d '{"action":"update","params":{"id":"1","name":"Jane Doe"}}'
   */
  app.put('/operations/:id', (req, res) => {
    const id = req.params.id;
    const newOperation: Operation = req.body;

    const operation: Operation = storage.getOperation(id);

    const result = storage.updateOperation({
      ...operation,
      ...newOperation,
      id,
      updatedAt: new Date(),
    });

    res.json(result);
  });

  /**
   * @example
   * $ curl -X DELETE http://localhost:3000/operations/1
   */
  app.delete('/operations/:id', (req, res) => {
    const id = req.params.id;

    storage.deleteOperation(id);

    res.json({ id: req.params.id });
  });

  /**
   * @example
   * $ curl -X GET http://localhost:3000/operations/1/result
   */
  app.get('/operations/:id/result', (req, res) => {
    const id = req.params.id;
    const result: Record<string, unknown> = { id: '1', name: 'John Doe' };

    // TODO: Get operation result

    res.json(result);
  });
}

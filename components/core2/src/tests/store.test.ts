import { describe, expect, it } from '@jest/globals';

import { Operation } from '../models/operation';
import { Storage } from '../store';
import fixtures from './__fixtures__/operations';

describe('store', () => {
  let storage: Storage;

  it('should return operations', () => {
    storage = new Storage();
    storage.loadOperations(fixtures);
    expect(storage.getOperations()).toMatchSnapshot();
  });

  it('should return operation', () => {
    storage = new Storage();
    storage.loadOperations(fixtures);
    expect(storage.getOperation('1')).toMatchSnapshot();
  });

  it('should create operation', () => {
    storage = new Storage();
    storage.loadOperations(fixtures);

    const operation: Operation = {
      id: '5',
      action: 'create',
      params: { name: 'John Doe' },
      status: 'completed',
      result: { id: '5', name: 'John Doe' },
      createdAt: new Date('2021-01-01'),
      updatedAt: new Date('2021-01-01'),
    };

    expect(storage.createOperation(operation)).toMatchSnapshot();
    expect(storage.getOperations()).toMatchSnapshot();
  });

  it('should update operation', () => {
    storage = new Storage();
    storage.loadOperations(fixtures);

    const operation: Operation = {
      id: '3',
      action: 'create',
      params: { name: 'John Doe' },
      status: 'completed',
      result: { id: '3', name: 'John Doe' },
      createdAt: new Date('2021-01-01'),
      updatedAt: new Date('2021-01-01'),
    };

    expect(storage.updateOperation(operation)).toMatchSnapshot();
    expect(storage.getOperations()).toMatchSnapshot();
  });

  it('should delete operation', () => {
    storage = new Storage();
    storage.loadOperations(fixtures);

    expect(storage.deleteOperation('1')).toMatchSnapshot();
    expect(storage.getOperations()).toMatchSnapshot();
  });

  it('should return undefined if deleting operation that does not exist', () => {
    storage = new Storage();
    storage.loadOperations(fixtures);

    expect(storage.deleteOperation('5')).toMatchSnapshot();
    expect(storage.getOperations()).toMatchSnapshot();
  });

  it('should clear operations', () => {
    storage = new Storage();
    storage.loadOperations(fixtures);

    storage.clearOperations();
    expect(storage.getOperations()).toMatchSnapshot();
  });
});

import { Operation } from './models/operation';

export class Storage {
  private operations: Operation[] = [];

  loadOperations(operations: Operation[]): void {
    this.operations = [...operations];
  }

  getOperations(): Operation[] {
    return this.operations;
  }

  getOperation(id: string): Operation | undefined {
    return this.operations.find((operation) => operation.id === id);
  }

  createOperation(operation: Operation): Operation {
    this.operations.push(operation);
    return operation;
  }

  updateOperation(operation: Operation): Operation {
    const index = this.operations.findIndex((op) => op.id === operation.id);
    this.operations[index] = operation;
    return operation;
  }

  deleteOperation(id: string): Operation | undefined {
    const index = this.operations.findIndex((op) => op.id === id);
    if (index === -1) {
      return undefined;
    }
    return this.operations.splice(index, 1)[0];
  }

  clearOperations(): void {
    this.operations = [];
  }
}

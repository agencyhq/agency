export type OperationStatus = 'requested' | 'claimed' | 'processing' | 'completed' | 'failed';

export class Operation {
  id: string;
  action: string;
  params: Record<string, unknown>;
  status: OperationStatus;
  result: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

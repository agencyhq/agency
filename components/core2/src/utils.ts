import { OperationStatus } from "./models/operation";

export function validateStatus(status: string): OperationStatus | undefined {
  if(['requested', 'claimed', 'processing', 'completed', 'failed'].includes(status)) {
    return status as OperationStatus;
  }
}
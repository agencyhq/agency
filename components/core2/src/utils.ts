import { OperationStatus } from './models/operation';

/**
 * @param {string} status - status string representing potential operation status
 * @returns {OperationStatus | undefined} - valid operation status or undefined
 */
export function validateStatus(status: string): OperationStatus | undefined {
  if (['requested', 'claimed', 'processing', 'completed', 'failed'].includes(status)) {
    return status as OperationStatus;
  }
}

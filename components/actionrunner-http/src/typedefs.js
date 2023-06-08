/**
 * Execution status represents current state of the execution.
 *
 * Currently, the state transitions for executions should look like that:
 * flowchart LR
 * A[requested] --> B[scheduled]
 * B --> C[claimed]
 * C --> D[running]
 * D --> E[completed]
 * @typedef {'requested' | 'scheduled' | 'claimed' | 'running' | 'completed'} ExecutionStatus
 */

/**
 * Execution represents a unit of work as a response to event that actually passed the trigger and got matched with the rule
 * @template {object} T
 * @typedef {object} Execution
 * @property {string} id
 * @property {string} triggered_by
 * @property {string} matched_to
 * @property {string?} hash
 * @property {ExecutionStatus} status
 * @property {string} action
 * @property {T} parameters
 * @property {string} user
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Execution parameters for an HTTP action
 * @typedef {object} HttpActionExecutionParameters
 * @property {string} url
 * @property {object} payload
 */

/**
 * RPC response for `execution` method call
 * @typedef {object} ExecutionClaim
 * @property {boolean} granted
 */

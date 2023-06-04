import express from 'express'
import log from 'loglevel'
import promMid from 'express-prometheus-middleware'
import Prometheus from 'prom-client'

const rpcMessagesCounter = new Prometheus.Counter({
  name: 'ifttt_rpc_messages_received',
  help: 'Counter for number of rpc messages received'
})

const rpcRequestDuration = new Prometheus.Histogram({
  name: 'ifttt_rpc_request_duration',
  help: 'Duration of rpc request in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1],
  labelNames: ['method', 'status']
})

const claimsReceivedCounter = new Prometheus.Counter({
  name: 'ifttt_actionrunner_claims_received',
  help: 'Counter for number of claims granted from api',
  labelNames: ['status']
})

const executionDuration = new Prometheus.Histogram({
  name: 'ifttt_actionrunner_execution_duration',
  help: 'Duration of execution in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1],
  labelNames: ['action', 'status']
})

const messageCounter = new Prometheus.Counter({
  name: 'ifttt_api_executions_received',
  help: 'Counter for number of messages of type received via mq from other nodes',
  labelNames: ['type']
})

const rulesRegisteredGauge = new Prometheus.Gauge({
  name: 'ifttt_ruleengine_rules_registered',
  help: 'Gauge for number of rules registered'
})

const ruleVMInitializationDuration = new Prometheus.Histogram({
  name: 'ifttt_ruleengine_rule_vm_initialization_duration',
  help: 'Time it takes to evaluate IF portion of the rule in seconds',
  buckets: Prometheus.exponentialBuckets(Math.pow(10, -3), 10, 5),
  labelNames: ['ruleId', 'result']
})

const ruleIfEvaluationDuration = new Prometheus.Histogram({
  name: 'ifttt_ruleengine_rule_if_evaluation_duration',
  help: 'Time it takes to evaluate IF portion of the rule in seconds',
  buckets: Prometheus.exponentialBuckets(Math.pow(10, -3), 10, 5),
  labelNames: ['ruleId', 'result']
})

const ruleThenEvaluationDuration = new Prometheus.Histogram({
  name: 'ifttt_ruleengine_rule_then_evaluation_duration',
  help: 'Time it takes to evaluate THEN portion of the rule in seconds',
  buckets: Prometheus.exponentialBuckets(Math.pow(10, -3), 10, 5),
  labelNames: ['ruleId']
})

const middleware = ({ prefix } = {}) => {
  Prometheus.collectDefaultMetrics()
  return promMid({
    metricsPath: '/metrics',
    collectDefaultMetrics: false,
    prefix
  })
}

function createMonitoringServer (port) {
  const app = express()
  app.use(middleware())
  app.listen(port, () => {
    log.info(`Listening on http://localhost:${port}`)
  })

  return app
}

function instrumentRPCClient (client) {
  const connect = client.connect.bind(client)
  const call = client.call.bind(client)

  client.connect = async function (...args) {
    await connect(...args)

    client.ws.on('message', m => {
      rpcMessagesCounter.inc()
      log.debug('rpc message received:', m)
    })
  }

  client.call = async function (method, ...args) {
    const rpcRequestDurationEnd = rpcRequestDuration.startTimer({ method })
    try {
      const v = await call(method, ...args)
      rpcRequestDurationEnd({ status: 'resolved' })
      return v
    } catch (e) {
      rpcRequestDurationEnd({ status: 'rejected' })
      throw e
    }
  }
}

function countClaims (claim) {
  if (claim.granted) {
    claimsReceivedCounter.inc({ status: 'granted' })
  } else {
    claimsReceivedCounter.inc({ status: 'denied' })
  }

  return claim
}

function countRules (rules) {
  rulesRegisteredGauge.set(rules.length)
}

function countMessages (type) {
  messageCounter.inc({ type })
}

function measureExecutionDuration (execution, promise) {
  const executionDurationEnd = executionDuration.startTimer({ action: execution.action })

  promise
    .then(() => {
      executionDurationEnd({ status: 'succeeded' })
    })
    .catch(() => {
      executionDurationEnd({ status: 'failed' })
    })
}

function measureRuleInitDuration (rule) {
  return {
    end: ruleVMInitializationDuration.startTimer({ ruleId: rule.id })
  }
}

function measureRuleIfDuration (rule) {
  return {
    end: ruleIfEvaluationDuration.startTimer({ ruleId: rule.id })
  }
}

function measureRuleThenDuration (rule) {
  return {
    end: ruleThenEvaluationDuration.startTimer({ ruleId: rule.id })
  }
}

export default {
  createServer: createMonitoringServer,
  instrumentRPCClient,
  countClaims,
  countRules,
  countMessages,
  measureExecutionDuration,
  measureRuleInitDuration,
  measureRuleIfDuration,
  measureRuleThenDuration,
  middleware
}

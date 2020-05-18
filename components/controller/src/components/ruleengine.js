const log = require('loglevel')
const Prometheus = require('prom-client')
const { VM, VMScript } = require('vm2')

const metrics = require('../metrics')
const rpc = require('../rpc/client')

log.setLevel(process.env.LOG_LEVEL || 'info')

const {
  PORT = 3000,
  METRICS = false
} = process.env

if (METRICS) {
  metrics.createServer(PORT)
}

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

async function main () {
  await rpc.connect()
  await rpc.auth({ token: 'alltoken' })

  const rules = (await rpc.call('rule.list'))
    .map(rule => {
      return {
        ...rule,
        if: new VMScript(rule.if),
        then: new VMScript(rule.then)
      }
    })

  log.info('registered %s rules', rules.length)
  rulesRegisteredGauge.set(rules.length)

  await rpc.subscribe('trigger', trigger => {
    log.info('processing trigger: %s', trigger.id)
    rules.forEach(rule => {
      const ruleVMInitializationDurationEnd = ruleVMInitializationDuration.startTimer({ ruleId: rule.id })
      const vm = new VM({
        timeout: 1000,
        sandbox: {
          trigger
        }
      })
      ruleVMInitializationDurationEnd()

      const ruleIfEvaluationDurationEnd = ruleIfEvaluationDuration.startTimer({ ruleId: rule.id })
      const isTriggered = vm.run(rule.if)
      ruleIfEvaluationDurationEnd({ result: isTriggered })

      if (isTriggered) {
        log.info('found match for trigger: %s', trigger.id)
        const ruleThenEvaluationDurationEnd = ruleThenEvaluationDuration.startTimer({ ruleId: rule.id })
        const { action, parameters = {} } = vm.run(rule.then)
        ruleThenEvaluationDurationEnd()
        const execution = {
          triggered_by: trigger.id,
          action,
          parameters
        }
        rpc.call('execution.request', execution)
      }
    })
  })

  await rpc.notify('ready')
  log.info('ready to handle triggers')
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

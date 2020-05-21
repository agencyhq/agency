const metrics = require('@agencyhq/agency-metrics')
const RPC = require('@agencyhq/jsonrpc-ws')
const log = require('loglevel')
const { VM } = require('vm2')

log.setLevel(process.env.LOG_LEVEL || 'info')

const rpc = new RPC.Client(process.env.RPC_CONNECTION_STRING || 'ws://localhost:3000/')

metrics.instrumentRPCClient(rpc)

const {
  PORT = 3000,
  METRICS = false
} = process.env

if (METRICS) {
  metrics.createServer(PORT)
}

const rules = []

function initializeRule (rule) {
  const initDuration = metrics.measureRuleInitDuration(rule)
  const vm = new VM({
    timeout: 1000,
    sandbox: {}
  })
  vm.run('module = { exports: {} }')

  const res = {
    ...rule,
    vm,
    errors: []
  }

  try {
    vm.run(rule.code)
  } catch (err) {
    res.errors.push(err.toString())
  }

  const { exports } = vm.sandbox.module

  if (!exports.if || typeof exports.if !== 'function') {
    res.errors.push("expect rule to export function 'if'")
  } else {
    res.if = exports.if
  }

  if (!exports.then || typeof exports.then !== 'function') {
    res.errors.push("expect rule to export function 'then'")
  } else {
    res.then = exports.then
  }

  initDuration.end()

  return res
}

async function main () {
  await rpc.connect()
  await rpc.auth({ token: 'alltoken' })

  const req = await rpc.call('rule.list')

  for (const rule of req) {
    rules.push(initializeRule(rule))
  }

  await rpc.subscribe('rule', (rule) => {
    const index = rules.findIndex(r => r.id === rule.id)
    if (index === -1) {
      rules.push(initializeRule(rule))
    } else {
      if (rule.deleted) {
        rules.splice(index, 1)
      } else {
        rules[index] = initializeRule(rule)
      }
    }

    log.info('registered %s rules', rules.length)
    metrics.countRules(rules)
  })

  log.info('registered %s rules', rules.length)
  metrics.countRules(rules)

  await rpc.subscribe('trigger', trigger => {
    log.info('processing trigger: %s', trigger.id)
    rules.forEach(rule => {
      const ifDuration = metrics.measureRuleInitDuration(rule)
      const isTriggered = (() => {
        try {
          return rule.if(trigger)
        } catch (e) {
          rpc.notify('trigger.evaluationError', e)
          log.debug('trigger evaluation error: %s', e.toString())
          return false
        }
      })()

      ifDuration.end({ result: isTriggered })

      if (isTriggered) {
        log.info('found match for trigger: %s', trigger.id)
        const thenDuration = metrics.measureRuleThenDuration(rule)
        const { action, parameters = {} } = (() => {
          try {
            return rule.then(trigger)
          } catch (e) {
            rpc.notify('trigger.evaluationError', e)
            log.debug('trigger evaluation error: %s', e.toString())
            return {}
          }
        })()
        thenDuration.end()

        if (!action) {
          return
        }

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

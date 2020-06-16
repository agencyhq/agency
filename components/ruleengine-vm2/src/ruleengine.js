const metrics = require('@agencyhq/agency-metrics')
const RPC = require('@agencyhq/jsonrpc-ws')
const log = require('loglevel')
const { VM } = require('vm2')
const babel = require('@babel/core')

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
    sandbox: {
      console: {
        log: (...args) => {
          rpc.notify('rule.log', [...args])
          log.debug('rule log: %s', [...args])
        }
      }
    }
  })
  vm.run('exports = {}; module = { exports }')

  const res = {
    ...rule,
    vm,
    errors: []
  }

  const transpile = babel.transform(rule.code, {
    plugins: [
      require('@babel/plugin-transform-modules-commonjs')
    ],
    sourceType: 'module'
  })

  try {
    vm.run(transpile.code)
  } catch (err) {
    res.errors.push(err.toString())
  }

  const exports = vm.sandbox.module.exports || vm.sandbox.exports

  if (exports.condition && !exports.if) {
    exports.if = exports.condition
  }

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

async function evaluateRule (rule, trigger) {
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

  if (!isTriggered) {
    return
  }

  log.debug('found match for trigger: %s', trigger.id)

  const executions = []
  try {
    executions[0] = await rpc.call('execution.request', {
      triggered_by: trigger.id,
      matched_to: rule.id,
      hash: 0
    })
    log.debug('granted claim for trigger %s matching rule %s', trigger.id, rule.id)
  } catch (e) {
    log.debug('denied claim for trigger %s matching rule %s', trigger.id, rule.id)
    return
  }

  const thenDuration = metrics.measureRuleThenDuration(rule)
  const results = []
  try {
    const res = rule.then(trigger)
    if (res.length) {
      results.push(...res)
    } else {
      results.push(res)
    }
  } catch (e) {
    rpc.notify('trigger.evaluationError', e)
    log.debug('trigger evaluation error: %s', e.toString())
    return {}
  }
  thenDuration.end()

  for (const index in results) {
    if (index > 0) {
      executions[index] = await rpc.call('execution.request', {
        triggered_by: trigger.id,
        matched_to: rule.id,
        hash: index
      })
      log.debug(
        'requested additional execution for trigger %s matching rule %s with hash %s',
        trigger.id, rule.id, index
      )
    }

    const {
      action,
      parameters = {},
      hash = index
    } = results[index]

    if (!action) {
      rpc.notify('trigger.evaluationError', `rule ${rule.id}:${hash} produced no action`)
      log.debug('trigger evaluation error: %s', `rule ${rule.id}:${hash} produced no action`)
      continue
    }

    executions[index].hash = hash
    executions[index].action = action
    executions[index].parameters = parameters

    await rpc.call('execution.schedule', executions[index])
  }
}

async function main () {
  rpc.on('disconnected', () => {
    process.exit(1)
  })

  await rpc.connect()
  await rpc.auth({ token: 'ruletoken' })

  const req = await rpc.call('rule.list')

  for (const rule of req) {
    rules.push(initializeRule(rule))
  }

  await rpc.subscribe('rule', (rule) => {
    const index = rules.findIndex(r => r.id === rule.id)
    if (index === -1) {
      if (!rule.deleted) {
        rules.push(initializeRule(rule))
      }
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

  await rpc.subscribe('trigger', async trigger => {
    log.debug('processing trigger: %s', trigger.id)
    const evaluations = rules.map(rule => evaluateRule(rule, trigger))

    await Promise.allSettled(evaluations)
    log.info('processed all rules for the trigger: %s', trigger.id)
  })

  await rpc.notify('ready')
  log.info('ready to handle triggers')
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

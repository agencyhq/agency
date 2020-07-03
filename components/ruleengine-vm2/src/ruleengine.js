const metrics = require('@agencyhq/agency-metrics')
const RPC = require('@agencyhq/jsonrpc-ws')
const log = require('loglevel')
const { VM } = require('vm2')
const babel = require('@babel/core')

log.setLevel(process.env.LOG_LEVEL || 'info')

const rpc = new RPC.Client(process.env.AGENCY_URL || 'ws://localhost:3000/')

metrics.instrumentRPCClient(rpc)

const rules = []

function initializeRule (rule) {
  const initDuration = metrics.measureRuleInitDuration(rule)
  const vm = new VM({
    timeout: 1000,
    sandbox: {
      console: {
        log: (...args) => {
          rpc.notify('rule.log', { rule, args }, { become: rule.user })
          log.debug('rule log:', ...args)
        }
      }
    }
  })
  vm.run('exports = {}; module = { exports }')

  const res = {
    id: rule.id,
    user: rule.user,
    rule,
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
  const ifDuration = metrics.measureRuleIfDuration(rule)
  const isTriggered = (() => {
    try {
      return rule.if(trigger)
    } catch (e) {
      rpc.notify('rule.error', {
        rule: rule.rule,
        trigger,
        error: e.toString()
      }, {
        become: rule.user
      })
      log.debug('rule evaluation error: %s', e.toString())
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
    }, { become: rule.user })
    log.debug('granted claim for trigger %s matching rule %s', trigger.id, rule.id)
  } catch (e) {
    log.debug('denied claim for trigger %s matching rule %s', trigger.id, rule.id)
    return
  }

  const thenDuration = metrics.measureRuleThenDuration(rule)
  const results = []
  try {
    const res = rule.then(trigger)
    if (res && res.length) {
      results.push(...res)
    } else {
      results.push(res)
    }
  } catch (e) {
    rpc.notify('rule.error', {
      rule: rule.rule,
      trigger,
      error: e.toString()
    }, {
      become: rule.user
    })
    log.debug('rule evaluation error: %s', e.toString())
    return {}
  }
  thenDuration.end()

  for (const index in results) {
    if (index > 0) {
      executions[index] = await rpc.call('execution.request', {
        triggered_by: trigger.id,
        matched_to: rule.id,
        hash: index
      }, { become: rule.user })
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
      rpc.notify('rule.error', {
        rule: rule.rule,
        trigger,
        error: `no action produced in hash ${hash}`
      }, {
        become: rule.user
      })
      log.debug('rule evaluation error: %s', `rule ${rule.id}:${hash} produced no action`)
      continue
    }

    executions[index].hash = hash
    executions[index].action = action
    executions[index].parameters = parameters

    await rpc.call('execution.schedule', executions[index], { become: rule.user })
  }
}

async function main () {
  const {
    PORT = 3000,
    METRICS = false,
    AGENCY_TOKEN
  } = process.env

  if (METRICS) {
    metrics.createServer(PORT)
  }

  rpc.on('disconnected', () => {
    process.exit(1)
  })

  await rpc.connect()
  await rpc.auth({ token: AGENCY_TOKEN })

  const req = await rpc.call('rule.list', {}, { become: '*' })

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
}

module.exports = {
  main
}

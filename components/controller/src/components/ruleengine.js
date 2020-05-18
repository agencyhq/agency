const metrics = require('@agencyhq/agency-metrics')
const RPC = require('@agencyhq/jsonrpc-ws')
const log = require('loglevel')
const { VM, VMScript } = require('vm2')

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
  metrics.countRules(rules)

  await rpc.subscribe('trigger', trigger => {
    log.info('processing trigger: %s', trigger.id)
    rules.forEach(rule => {
      const initDuration = metrics.measureRuleInitDuration(rule)
      const vm = new VM({
        timeout: 1000,
        sandbox: {
          trigger
        }
      })
      initDuration.end()

      const ifDuration = metrics.measureRuleInitDuration(rule)
      const isTriggered = vm.run(rule.if)
      ifDuration.end({ result: isTriggered })

      if (isTriggered) {
        log.info('found match for trigger: %s', trigger.id)
        const thenDuration = metrics.measureRuleThenDuration(rule)
        const { action, parameters = {} } = vm.run(rule.then)
        thenDuration.end()
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

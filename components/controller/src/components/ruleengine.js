const log = require('loglevel')
const { VM, VMScript } = require('vm2')

const rpc = require('../rpc/client')

log.setLevel(process.env.LOG_LEVEL || 'info')

async function main () {
  await rpc.connect('/rule')

  const rules = (await rpc.call('rule.list'))
    .map(rule => {
      return {
        ...rule,
        if: new VMScript(rule.if),
        then: new VMScript(rule.then)
      }
    })

  rpc.on('trigger', trigger => {
    log.info('processing trigger: %s', trigger.id)

    rules.forEach(rule => {
      const vm = new VM({
        timeout: 1000,
        sandbox: {
          trigger
        }
      })

      if (vm.run(rule.if)) {
        log.info('found match for trigger: %s', trigger.id)
        const { action, parameters = {} } = vm.run(rule.then)
        const execution = {
          triggered_by: trigger.id,
          action,
          parameters
        }
        rpc.call('execution.request', execution)
      }
    })
  })

  await rpc.subscribe('trigger')
  await rpc.notify('ready')
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

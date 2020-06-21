const log = require('loglevel')

const { main } = require('../src/telegram')

log.setLevel(process.env.LOG_LEVEL || 'info')

main()
  .then(() => {
    log.info('ready to handle executions and emit triggers')
  })
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

const log = require('loglevel')

const { main } = require('../src/github')

log.setLevel(process.env.LOG_LEVEL || 'info')

main()
  .then(() => {
    log.info('ready to handle webhooks and executions')
  })
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

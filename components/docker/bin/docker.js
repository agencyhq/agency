const log = require('loglevel')

const { main } = require('../src/docker')

log.setLevel(process.env.LOG_LEVEL || 'info')

main()
  .then(() => {
    log.info('ready to handle executions')
  })
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

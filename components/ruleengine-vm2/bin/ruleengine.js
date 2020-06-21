const log = require('loglevel')

const { main } = require('../src/ruleengine')

log.setLevel(process.env.LOG_LEVEL || 'info')

main()
  .then(() => {
    log.info('ready to handle triggers')
  })
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

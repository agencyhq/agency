const log = require('loglevel')

const { main } = require('../src/sensor')

log.setLevel(process.env.LOG_LEVEL || 'info')

main()
  .then(() => {
    log.info('ready to emit triggers')
  })
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

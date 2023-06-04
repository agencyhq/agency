import log from 'loglevel'

import { main } from '../src/actionrunner.js'

log.setLevel(process.env.LOG_LEVEL || 'info')

main()
  .then(() => {
    log.info('ready to handle executions')
  })
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

import log from 'loglevel'

import { main } from '../src/sensor.js'

log.setLevel(process.env.LOG_LEVEL || 'info')

main()
  .then(() => {
    log.info('ready to emit triggers')
  })
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

#!/usr/bin/env node
import log from 'loglevel'

import { main } from '../src/cli.js'

log.setLevel(process.env.LOG_LEVEL || 'info')

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

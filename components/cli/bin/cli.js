#!/usr/bin/env node
const log = require('loglevel')

const { main } = require('../src/cli')

log.setLevel(process.env.LOG_LEVEL || 'info')

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

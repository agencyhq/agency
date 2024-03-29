const crypto = require('crypto')

const metrics = require('@agencyhq/agency-metrics')
const RPC = require('@agencyhq/jsonrpc-ws')
const express = require('express')
const log = require('loglevel')
const morgan = require('morgan')

log.setLevel(process.env.LOG_LEVEL || 'info')

const rpc = new RPC.Client(process.env.AGENCY_URL || 'ws://localhost:3000/')

metrics.instrumentRPCClient(rpc)

async function handleRequest (req, res) {
  const trigger = {
    id: crypto.randomBytes(16).toString('hex'),
    type: 'http',
    event: {
      path: req.path,
      headers: req.headers,
      query: req.query,
      body: req.body
    }
  }

  await rpc.call('trigger.emit', trigger, { become: '*' })

  res.send('OK')
}

async function main () {
  const {
    PORT = 3001,
    METRICS = false,
    AGENCY_TOKEN
  } = process.env

  rpc.on('disconnected', () => {
    process.exit(1)
  })

  await rpc.connect()
  await rpc.auth({ token: AGENCY_TOKEN })

  const app = express()

  if (METRICS) {
    app.use(metrics.middleware({
      prefix: 'ifttt_sensor_http_'
    }))
  }
  app.use(express.json())
  app.use(morgan('short', {
    stream: {
      write: log.debug
    }
  }))

  app.post('*', handleRequest)

  app.listen(PORT, async () => {
    await rpc.notify('ready')
    log.info(`Listening on http://localhost:${PORT}`)
  })
}

module.exports = {
  main,
  rpc,
  handleRequest
}

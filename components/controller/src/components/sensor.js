const crypto = require('crypto')

const express = require('express')
const log = require('loglevel')
const morgan = require('morgan')

const metrics = require('../metrics')
const rpc = require('../rpc/client')

log.setLevel(process.env.LOG_LEVEL || 'info')

const {
  PORT = 3001,
  METRICS = false
} = process.env

async function main () {
  await rpc.connect()
  await rpc.auth({ token: 'alltoken' })
  await rpc.notify('ready')

  const app = express()

  if (METRICS) {
    app.use(metrics.middleware({
      prefix: 'ifttt_sensor_http_'
    }))
  }
  app.use(express.json())
  app.use(morgan('combined'))

  app.post('*', async (req, res) => {
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

    rpc.call('trigger.emit', trigger)
    res.send('OK')
  })

  app.listen(PORT, () => {
    log.info(`Listening on http://localhost:${PORT}`)
  })
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

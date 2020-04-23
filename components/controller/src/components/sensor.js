const crypto = require('crypto')

const express = require('express')
const log = require('loglevel')

const rpc = require('../rpc/client')

log.setLevel(process.env.LOG_LEVEL || 'info')

async function main () {
  rpc.connect('/sensor')

  const app = express()

  app.use(express.json())

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

  app.listen(3001)
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

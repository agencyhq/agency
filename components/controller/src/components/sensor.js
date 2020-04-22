const crypto = require('crypto')

const express = require('express')
const log = require('loglevel')
const RPCClient = require('rpc-websockets').Client

log.setLevel(process.env.LOG_LEVEL || 'info')

async function main () {
  const rpc = new RPCClient(process.env.RPC_CONNECTION_STRING || 'ws://localhost:3000/')
  await new Promise(resolve => {
    rpc.once('open', resolve)
  })

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

const { createServer } = require('http')
const util = require('util')

const cors = require('cors')
const express = require('express')
const log = require('loglevel')
const morgan = require('morgan')

const pubsub = require('../pubsub')
const WebSocket = require('ws')

log.setLevel(process.env.LOG_LEVEL || 'info')

class WS {
  init (server) {
    this.connections = []
    this.wss = new WebSocket.Server({ server })

    this.wss.on('connection', (ws, request) => {
      this.connections.push(ws)
      ws.on('message', (message) => {
        console.log(`WS message ${message}`)
      })
    })
  }

  broadcast (msg) {
    for (const id in this.connections) {
      this.connections[id].send(JSON.stringify(msg))
    }
  }
}

const ws = new WS()

async function handleMessages (msg) {
  const message = JSON.parse(msg.content.toString())
  log.debug('%s:%s', msg.fields.routingKey, util.inspect(message))

  ws.broadcast({
    key: msg.fields.routingKey,
    message
  })

  pubsub.channel.ack(msg)
}

async function main () {
  await pubsub.init()
  pubsub.subscribe('*', handleMessages, { name: '', exclusive: true })

  const app = express()

  app.use(cors())
  app.use(morgan('combined'))

  const server = createServer(app)
  ws.init(server)

  server.listen(3002, () => {
    log.info('Listening on http://localhost:3002')
  })
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

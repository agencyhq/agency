const http = require('http')
const util = require('util')

const cors = require('cors')
const express = require('express')
const log = require('loglevel')
const morgan = require('morgan')

const pubsub = require('../pubsub')
const router = require('../rest/router')
const RPCServer = require('../rpc/server')

log.setLevel(process.env.LOG_LEVEL || 'info')

async function handleExecution (rpc, msg) {
  const message = JSON.parse(msg.content.toString())
  log.debug('%s:%s', msg.fields.routingKey, util.inspect(message))

  rpc.emit('execution', message)

  pubsub.channel.ack(msg)
}

async function handleTrigger (rpc, msg) {
  const message = JSON.parse(msg.content.toString())
  log.debug('%s:%s', msg.fields.routingKey, util.inspect(message))

  rpc.of('/rule').emitRandomly('trigger', message)

  pubsub.channel.ack(msg)
}

async function main () {
  await pubsub.init()

  const app = express()
  const server = http.createServer(app)
  const rpc = new RPCServer({ server })

  app.use(cors())
  app.use(express.json())
  app.use(morgan('combined'))
  app.use(router('../openapi.yaml'))

  rpc.registerSpec('../rpcapi.yaml')

  pubsub.subscribe('execution', msg => handleExecution(rpc, msg))
  pubsub.subscribe('trigger', msg => handleTrigger(rpc, msg))

  server.listen(3000, () => {
    log.info('Listening on http://localhost:3000')
  })
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

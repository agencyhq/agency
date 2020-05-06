const http = require('http')
const util = require('util')

const cors = require('cors')
const express = require('express')
const log = require('loglevel')
const morgan = require('morgan')
const promMid = require('express-prometheus-middleware')
const Prometheus = require('prom-client')

const pubsub = require('../pubsub')
const router = require('../rest/router')
const RPCServer = require('../rpc/server')

log.setLevel(process.env.LOG_LEVEL || 'info')

const executionCounter = new Prometheus.Counter({
  name: 'ifttt_api_executions_received',
  help: 'Counter for number of executions received via mq from other nodes'
})

async function handleExecution (rpc, msg) {
  const message = JSON.parse(msg.content.toString())
  log.debug('reciving %s: %s', msg.fields.routingKey, util.inspect(message))
  executionCounter.inc()

  rpc.emit('execution', message)

  log.debug('acknowledge reciving %s: %s', msg.fields.routingKey, message.id)
  pubsub.channel.ack(msg)
}

const triggerCounter = new Prometheus.Counter({
  name: 'ifttt_api_triggers_received',
  help: 'Counter for number of triggers received via mq from other nodes'
})

async function handleTrigger (rpc, msg) {
  const message = JSON.parse(msg.content.toString())
  log.debug('reciving %s: %s', msg.fields.routingKey, util.inspect(message))
  triggerCounter.inc()

  if (rpc.of('/rule').hasSubscribers('trigger')) {
    rpc.of('/rule').emitRandomly('trigger', message)

    log.debug('acknowledge reciving %s: %s', msg.fields.routingKey, message.id)
    pubsub.channel.ack(msg)
  } else {
    log.debug('reject reciving %s: %s', msg.fields.routingKey, message.id)
    pubsub.channel.nack(msg)
  }
}

async function main () {
  await pubsub.init()

  const app = express()
  const server = http.createServer(app)
  const rpc = new RPCServer({ server })

  app.use(promMid({
    metricsPath: '/metrics',
    collectDefaultMetrics: true,
    prefix: 'ifttt_api_'
  }))
  app.use(cors())
  app.use(express.json())
  app.use(morgan('combined'))
  app.use(router('../openapi.yaml'))

  rpc.registerSpec('../rpcapi.yaml')

  pubsub.subscribe('execution', msg => handleExecution(rpc, msg), {
    name: false,
    exclusive: true
  })

  rpc.of('/rule').register('ready', () => {
    if (pubsub.isSubscribed('trigger')) {
      return
    }

    pubsub.subscribe('trigger', msg => handleTrigger(rpc, msg))
  })

  rpc.on('disconnect', () => {
    if (!rpc.of('/rule').hasSubscribers('trigger')) {
      pubsub.unsubscribe('trigger')
    }
  })

  server.listen(3000, () => {
    log.info('Listening on http://localhost:3000')
  })
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

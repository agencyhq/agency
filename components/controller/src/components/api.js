const http = require('http')
const util = require('util')

const cors = require('cors')
const express = require('express')
const log = require('loglevel')
const morgan = require('morgan')
const passport = require('passport')
const bearer = require('passport-http-bearer')
const Prometheus = require('prom-client')

const metrics = require('../metrics')
const pubsub = require('../pubsub')
const router = require('../rest/router')
const RPCServer = require('../rpc/server')

log.setLevel(process.env.LOG_LEVEL || 'info')

const {
  PORT = 3000,
  METRICS = false
} = process.env

const USERS = {
  alltoken: ['enykeev', { scopes: ['all'] }],
  sometoken: ['someguy', { scopes: ['web'] }]
}

const executionCounter = new Prometheus.Counter({
  name: 'ifttt_api_executions_received',
  help: 'Counter for number of executions received via mq from other nodes'
})

async function handleExecution (rpc, msg) {
  const message = JSON.parse(msg.content.toString())
  log.debug('reciving %s: %s', msg.fields.routingKey, util.inspect(message))
  executionCounter.inc()

  rpc.notify('execution', message)

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

  if (rpc.hasSubscribers('trigger')) {
    rpc.notify('trigger', message, { random: true })

    log.debug('acknowledge reciving %s: %s', msg.fields.routingKey, message.id)
    pubsub.channel.ack(msg)
  } else {
    log.debug('reject reciving %s: %s', msg.fields.routingKey, message.id)
    pubsub.channel.nack(msg)
  }
}

async function auth (token) {
  if (USERS[token]) {
    const [username, info] = USERS[token]
    return {
      username,
      info
    }
  }
}

passport.use(new bearer.Strategy(
  (token, done) => {
    auth(token)
      .then(({ username, info } = {}) => done(null, username || false, info))
      .catch(err => done(err))
  }
))

async function main () {
  await pubsub.init()

  const authenticate = async ({ token }) => {
    const { username: user, info: { scopes } } = await auth(token)

    return {
      user,
      scopes
    }
  }

  const app = express()
  const server = http.createServer(app)
  const rpc = new RPCServer({ server, authenticate })

  if (METRICS) {
    app.use(metrics.middleware({
      prefix: 'ifttt_api_'
    }))
  }
  app.use(cors())
  app.use(morgan('combined'))
  app.use(passport.authenticate('bearer', { session: false }))
  app.use(express.json())
  app.use(router('../openapi.yaml'))

  pubsub.subscribe('execution', msg => handleExecution(rpc, msg), {
    name: false,
    exclusive: true
  })

  rpc.registerMethod('ready', () => {
    if (pubsub.isSubscribed('trigger')) {
      return
    }

    pubsub.subscribe('trigger', msg => handleTrigger(rpc, msg))
  })

  rpc.on('disconnect', () => {
    if (!rpc.hasSubscribers('trigger')) {
      pubsub.unsubscribe('trigger')
    }
  })

  server.listen(PORT, () => {
    log.info(`Listening on http://localhost:${PORT}`)
  })
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

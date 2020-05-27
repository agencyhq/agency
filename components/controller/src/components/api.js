const http = require('http')
const util = require('util')

const metrics = require('@agencyhq/agency-metrics')
const cors = require('cors')
const express = require('express')
const log = require('loglevel')
const morgan = require('morgan')
const passport = require('passport')
const bearer = require('passport-http-bearer')

const pubsub = require('../pubsub')
const router = require('../rest/router')
const RPCServer = require('../rpc/server')
const models = require('../models')

log.setLevel(process.env.LOG_LEVEL || 'info')

const {
  PORT = 3000,
  METRICS = false
} = process.env

async function handleExecution (rpc, msg) {
  const execution = JSON.parse(msg.content.toString())
  metrics.countExecutions(execution)
  log.debug('reciving %s: %s', msg.fields.routingKey, util.inspect(execution))

  rpc.notify('execution', execution)

  log.debug('acknowledge reciving %s: %s', msg.fields.routingKey, execution.id)
  pubsub.channel.ack(msg)
}

async function handleTrigger (rpc, msg) {
  const trigger = JSON.parse(msg.content.toString())
  metrics.countTriggers(trigger)
  log.debug('reciving %s: %s', msg.fields.routingKey, util.inspect(trigger))

  if (rpc.hasSubscribers('trigger')) {
    rpc.notify('trigger', trigger, { random: true })

    log.debug('acknowledge reciving %s: %s', msg.fields.routingKey, trigger.id)
    pubsub.channel.ack(msg)
  } else {
    log.debug('reject reciving %s: %s', msg.fields.routingKey, trigger.id)
    pubsub.channel.nack(msg)
  }
}

async function handleRule (rpc, msg) {
  const rule = JSON.parse(msg.content.toString())
  // metrics.countTriggers(trigger)
  log.debug('reciving %s: %s', msg.fields.routingKey, util.inspect(rule))

  rpc.notify('rule', rule)

  log.debug('acknowledge reciving %s: %s', msg.fields.routingKey, rule.id)
  pubsub.channel.ack(msg)
}

async function auth (token) {
  const identity = await models.Tokens
    .forge({ id: token })
    .fetch()
    .then(model => model.toJSON())

  const {
    id,
    user,
    meta: {
      scopes
    }
  } = identity

  if (id === token) {
    return {
      user,
      scopes
    }
  }

  return false
}

passport.use(new bearer.Strategy(
  (token, done) => {
    auth(token)
      .then(({ user, scopes } = {}) => done(null, user || false, { scopes }))
      .catch(err => done(err))
  }
))

async function main () {
  await pubsub.init()

  const authenticate = async ({ token }) => {
    const identity = await auth(token)

    if (!identity) {
      return false
    }

    const {
      user,
      scopes
    } = identity

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
  app.use(router('../openapi.yaml', opId => {
    return require(`../rest/methods/${opId}`)
  }))

  pubsub.subscribe('execution', msg => handleExecution(rpc, msg), {
    name: false,
    exclusive: true
  })

  pubsub.subscribe('rule', msg => handleRule(rpc, msg), {
    name: false,
    exclusive: true
  })

  rpc.registerMethod('ready', () => {
    if (pubsub.isSubscribed('trigger')) {
      return
    }

    if (!rpc.hasSubscribers('trigger')) {
      return
    }

    pubsub.subscribe('trigger', msg => handleTrigger(rpc, msg))
  }, {
    scopes: ['any']
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

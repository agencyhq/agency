const http = require('http')

const metrics = require('@agencyhq/agency-metrics')
const cors = require('cors')
const express = require('express')
const log = require('loglevel')
const morgan = require('morgan')
const passport = require('passport')
const bearer = require('passport-http-bearer')

const pubsub = require('./pubsub')
const RPCServer = require('./rpc/server')
const models = require('./models')

log.setLevel(process.env.LOG_LEVEL || 'info')

const {
  PORT = 3000,
  METRICS = false
} = process.env

async function auth (token) {
  const identity = await models.Tokens
    .forge({ id: token || '' })
    .fetch({ require: false })
    .then(model => model ? model.toJSON() : {})
    .catch(err => {
      log.warn(err)
      return {}
    })

  const {
    id,
    user,
    meta: {
      scopes
    } = {}
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
  app.use(morgan('short', {
    stream: {
      write: str => log.debug(str)
    }
  }))
  app.use(passport.authenticate('bearer', { session: false }))
  app.use(express.json())

  rpc.registerMethod('ready', () => {}, { scopes: ['any'] })

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

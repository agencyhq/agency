const crypto = require('crypto')
const http = require('http')
const util = require('util')

const cors = require('cors')
const express = require('express')
const log = require('loglevel')
const morgan = require('morgan')

const pubsub = require('../pubsub')
const models = require('../models')
const RPCServer = require('../rpc/server')

log.setLevel(process.env.LOG_LEVEL || 'info')

const app = express()
const server = http.createServer(app)
const rpc = new RPCServer({ server })

const router = express.Router()

router.get('/', (req, res) => {
  res.send('Hello World')
})

router.get('/executions', async (req, res) => {
  const collection = await models.Executions
    .query(q => q.orderBy('created_at', 'DESC'))
    .fetchAll({
      withRelated: ['result']
    })
    .map(execution => {
      return {
        ...execution.serialize(),
        status: execution.relations.result.get('status'),
        result: execution.relations.result.get('result')
      }
    })

  res.json(collection)
})

router.get('/rules', async (req, res) => {
  const rules = await models.Rules
    .fetchAll()

  res.json(rules)
})

router.post('/rules', async (req, res) => {
  const { if: _if, then } = req.body

  if (!_if || !then || typeof _if !== 'string' || typeof then !== 'string') {
    return res.status(400).end()
  }

  const model = await models.Rules.forge({
    id: crypto.randomBytes(16).toString('hex')
  })
    .save({
      if: _if,
      then: then
    }, {
      method: 'insert'
    })

  res.json(model)
})

router.get('/rules/:id', async (req, res) => {
  const { params } = req

  const rule = await models.Rules
    .forge({
      id: params.id
    })
    .fetch()

  res.json(rule)
})

router.delete('/rules/:id', async (req, res) => {
  const { params } = req

  await models.Rules
    .forge({
      id: params.id
    })
    .destroy()

  res.send('OK')
})

rpc.event('execution')

rpc.register('trigger.emit', trigger => {
  pubsub.publish('trigger', trigger)
})

rpc.register('rule.list', async query => {
  return await models.Rules
    .fetchAll(query)
})

rpc.register('execution.claim', async ({ id }) => {
  try {
    await models.Executions.forge({ id })
      .where('status', 'requested')
      .save({
        status: 'claimed'
      })
  } catch (e) {
    log.info(`claim denied: ${id}`)
    return {
      granted: false
    }
  }

  log.info(`claim granted: ${id}`)
  return {
    granted: true
  }
})

rpc.register('execution.started', async ({ id }) => {
  log.info('execution started: %s', id)
  await models.Executions.forge({ id })
    .where('status', 'claimed')
    .save({
      status: 'running'
    })
})

rpc.register('execution.completed', async result => {
  const mod = models.Results.forge(result)
  await mod.save(null, { method: 'insert' })
  return true
})

const ruleNS = rpc.of('/rule')

ruleNS.event('trigger')

ruleNS.register('rule.list', async query => {
  return await models.Rules
    .fetchAll(query)
})

ruleNS.register('execution.request', async message => {
  const mod = models.Executions.forge({
    ...message,
    id: crypto.randomBytes(16).toString('hex'),
    created_at: new Date().toISOString(),
    status: 'requested'
  })
  const execution = await mod.save(null, { method: 'insert' })
  await pubsub.publish('execution', execution)
})

async function handleExecution (msg) {
  const message = JSON.parse(msg.content.toString())
  log.debug('%s:%s', msg.fields.routingKey, util.inspect(message))

  rpc.emit('execution', message)

  pubsub.channel.ack(msg)
}

async function handleTrigger (msg) {
  const message = JSON.parse(msg.content.toString())
  log.debug('%s:%s', msg.fields.routingKey, util.inspect(message))

  ruleNS.emitRandomly('trigger', message)

  pubsub.channel.ack(msg)
}

async function main () {
  await pubsub.init()
  pubsub.subscribe('execution', handleExecution)
  pubsub.subscribe('trigger', handleTrigger)

  app.use(cors())
  app.use(express.json())
  app.use(morgan('combined'))
  app.use(router)

  server.listen(3000, () => {
    log.info('Listening on http://localhost:3000')
  })
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

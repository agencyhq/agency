const crypto = require('crypto')
const util = require('util')

const cors = require('cors')
const express = require('express')
const log = require('loglevel')
const morgan = require('morgan')

const pubsub = require('../pubsub')
const models = require('../models')

log.setLevel(process.env.LOG_LEVEL || 'info')

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

async function handleMessages (msg) {
  const message = JSON.parse(msg.content.toString())
  log.debug('%s:%s', msg.fields.routingKey, util.inspect(message))

  if (msg.fields.routingKey === 'execution') {
    const mod = models.Executions.forge(message)
    await mod.save(null, { method: 'insert' })
  }

  if (msg.fields.routingKey === 'result') {
    const mod = models.Results.forge(message)
    await mod.save(null, { method: 'insert' })
  }

  pubsub.channel.ack(msg)
}

async function main () {
  await pubsub.init()
  pubsub.subscribe('*', handleMessages)

  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use(morgan('combined'))
  app.use(router)

  app.listen(3000, () => {
    log.info('Listening on http://localhost:3000')
  })
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

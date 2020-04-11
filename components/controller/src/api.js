const util = require('util')

const express = require('express')

const pubsub = require('./pubsub')

// Server
;(async () => {
  await pubsub.init()

  pubsub.subscribe('*', msg => {
    const message = JSON.parse(msg.content.toString())
    console.log('%s:%s', msg.fields.routingKey, util.inspect(message))
  })

  const app = express()

  app.use(express.json())

  app.get('/', (req, res) => {
    res.send('Hello World')
  })

  app.get('/executions', async (req, res) => {
    res.send('OK')
  })

  app.listen(3000)
})()

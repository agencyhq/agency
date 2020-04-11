const express = require('express')

const pubsub = require('./pubsub')

// Server
;(async () => {
  await pubsub.trigger.init()

  const app = express()

  app.use(express.json())

  app.get('/', (req, res) => {
    res.send('Hello World')
  })

  app.post('/http', async (req, res) => {
    const data = {
      trigger: {
        type: 'http',
        event: req.body
      }
    }
    pubsub.trigger.publish('some', data)
    res.send('OK')
  })

  app.listen(3000)
})()

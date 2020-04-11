const express = require('express')
const amqp = require('amqplib')

const constants = require('./const')

// Server
;(async () => {
  const {
    TRIGGER_EXCHANGE_NAME,
    TRIGGER_EXCHANGE_TYPE,
    TRIGGER_EXCHANGE_OPTION
  } = constants

  const conn = await amqp.connect('amqp://localhost')
  const channel = await conn.createChannel()
  await channel.assertExchange(TRIGGER_EXCHANGE_NAME, TRIGGER_EXCHANGE_TYPE, TRIGGER_EXCHANGE_OPTION)

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
    channel.publish(TRIGGER_EXCHANGE_NAME, 'some', Buffer.from(JSON.stringify(data)))
    res.send('OK')
  })

  app.listen(3000)
})()

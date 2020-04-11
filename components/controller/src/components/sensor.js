const crypto = require('crypto')
const express = require('express')

const pubsub = require('../pubsub')

// Server
async function main () {
  await pubsub.init()

  const app = express()

  app.use(express.json())

  app.post('/http', async (req, res) => {
    const trigger = {
      id: crypto.randomBytes(16).toString('hex'),
      type: 'http',
      event: req.body
    }
    pubsub.publish('trigger', trigger)
    res.send('OK')
  })

  app.listen(3001)
}

main()
  .catch(e => console.error(e))

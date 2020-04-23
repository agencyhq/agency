const crypto = require('crypto')

const models = require('../../models')
const pubsub = require('../../pubsub')

module.exports = async message => {
  const mod = models.Executions.forge({
    ...message,
    id: crypto.randomBytes(16).toString('hex'),
    created_at: new Date().toISOString(),
    status: 'requested'
  })
  const execution = await mod.save(null, { method: 'insert' })
  await pubsub.publish('execution', execution)
}

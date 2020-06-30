const log = require('loglevel')

const models = require('../../models')
const pubsub = require('../../pubsub')

module.exports = async ({ id, action, parameters }, { user }) => {
  log.debug('execution scheduled: %s', id)

  const mod = models.Executions.forge({ id })
    .where({ user })

  const execution = await mod.save({
    updated_at: new Date().toISOString(),
    status: 'scheduled',
    action,
    parameters
  }, {
    method: 'update',
    patch: true
  })
  await pubsub.publish('execution', execution.toJSON())

  return execution.toJSON()
}

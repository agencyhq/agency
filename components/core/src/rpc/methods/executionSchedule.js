const log = require('loglevel')

const models = require('../../models')
const pubsub = require('../../pubsub')

module.exports = async ({ id, action, parameters }, { user }) => {
  log.debug('execution scheduled: %s', id)

  const mod = models.Executions.forge({ id })
    .where({ user })

  const res = await mod.save({
    updated_at: new Date().toISOString(),
    status: 'scheduled',
    action,
    parameters: JSON.stringify(parameters)
  }, {
    method: 'update',
    patch: true
  })

  const execution = {
    ...res.toJSON(),
    parameters
  }

  await pubsub.publish('execution', execution)

  return execution
}

const log = require('loglevel')
const models = require('../../models')
const pubsub = require('../../pubsub')

module.exports = async ({ id, status, result }, { user }) => {
  log.debug('execution reported completed: %s status=$s', id, status)

  const res = await models.bookshelf.transaction(async transacting => {
    const modExecution = models.Executions
      .forge({ id })
      .where({
        user,
        status: 'running'
      })

    const execution = await modExecution.save({
      updated_at: new Date().toISOString(),
      status: 'completed'
    }, { method: 'update', transacting })

    const modResult = models.Results.forge({
      id,
      status,
      result: JSON.stringify(result),
      user
    })
    await modResult.save(null, { method: 'insert', transacting })

    await pubsub.publish('result', { id, status, result, user })

    return execution.toJSON()
  })

  return res
}

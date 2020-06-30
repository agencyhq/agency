const log = require('loglevel')
const models = require('../../models')

module.exports = async ({ id }, { user }) => {
  log.debug('execution started: %s', id)
  const res = await models.Executions.forge({ id })
    .where({
      status: 'claimed',
      user
    })
    .save({
      status: 'running'
    })

  return res.toJSON()
}

const log = require('loglevel')
const models = require('../../models')

module.exports = async (result, { user }) => {
  log.debug('execution reported completed: %s status=$s', result.id, result.status)
  const mod = models.Results.forge({ ...result, user })
  await mod.save(null, { method: 'insert' })
  return true
}

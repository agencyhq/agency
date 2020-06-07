const log = require('loglevel')
const models = require('../../models')

module.exports = async result => {
  log.debug('execution reported completed: %s status=$s', result.id, result.status)
  const mod = models.Results.forge(result)
  await mod.save(null, { method: 'insert' })
  return true
}

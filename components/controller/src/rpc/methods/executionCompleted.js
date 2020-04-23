const models = require('../../models')

module.exports = async result => {
  const mod = models.Results.forge(result)
  await mod.save(null, { method: 'insert' })
  return true
}

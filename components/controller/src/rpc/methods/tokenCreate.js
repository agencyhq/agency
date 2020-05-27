const crypto = require('crypto')

const models = require('../../models')

module.exports = async (identity, { user }) => {
  const mod = models.Tokens.forge({
    id: crypto.randomBytes(16).toString('hex'),
    ...identity,
    created_by: user
  })
  const model = await mod.save(null, { method: 'insert' })

  return model
}

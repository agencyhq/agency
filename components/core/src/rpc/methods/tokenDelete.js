const models = require('../../models')

module.exports = async ({ id }) => {
  const query = { id }

  const mod = models.Tokens.forge(query)
  await mod.destroy()

  return { id, deleted: true }
}

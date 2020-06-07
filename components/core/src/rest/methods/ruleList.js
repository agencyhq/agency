const models = require('../../models')

module.exports = async (req, res) => {
  const rules = await models.Rules
    .fetchAll()

  res.json(rules)
}

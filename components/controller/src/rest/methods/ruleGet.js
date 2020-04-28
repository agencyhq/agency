const models = require('../../models')

module.exports = async (req, res) => {
  const { params } = req

  const rule = await models.Rules
    .forge({
      id: params.id
    })
    .fetch()

  res.json(rule)
}

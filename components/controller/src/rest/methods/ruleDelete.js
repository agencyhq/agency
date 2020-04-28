const models = require('../../models')

module.exports = async (req, res) => {
  const { params } = req

  await models.Rules
    .forge({
      id: params.id
    })
    .destroy()

  res.send('OK')
}

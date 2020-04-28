const crypto = require('crypto')
const models = require('../../models')

module.exports = async (req, res) => {
  const { if: _if, then } = req.body

  if (!_if || !then || typeof _if !== 'string' || typeof then !== 'string') {
    return res.status(400).end()
  }

  const model = await models.Rules.forge({
    id: crypto.randomBytes(16).toString('hex')
  })
    .save({
      if: _if,
      then: then
    }, {
      method: 'insert'
    })

  res.json(model)
}

const models = require('../../models')

module.exports = async query => {
  return await models.Rules
    .fetchAll(query)
}

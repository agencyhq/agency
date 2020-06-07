const models = require('../../models')

module.exports = async query => {
  return await models.Executions.forge()
    .orderBy('created_at', 'DESC')
    .fetchPage(query)
}

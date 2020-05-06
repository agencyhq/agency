const models = require('../../models')

module.exports = async (query) => {
  const model = await models.Rules

  if (!query) {
    query = {}
  }

  if (!query.limit && !query.pageSize) {
    return model.fetchAll(query)
  } else {
    return model.fetchPage(query)
  }
}

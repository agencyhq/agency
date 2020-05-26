const models = require('../../models')

module.exports = async (query, { user }) => {
  const model = await models.Rules

  if (!query) {
    query = {}
  }

  query.user = user

  if (!query.limit && !query.pageSize) {
    return model.fetchAll(query)
  } else {
    return model.fetchPage(query)
  }
}

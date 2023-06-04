import models from '../../models.js'

export default async (query) => {
  const model = await models.Tokens

  if (!query) {
    query = {}
  }

  if (!query.limit && !query.pageSize) {
    return model.fetchAll(query)
  } else {
    return model.fetchPage(query)
  }
}

import models from '../../models.js'

export default async (query = {}, { user }) => {
  const {
    pageSize,
    page,
    limit,
    offset,
    ...restQuery
  } = query

  if (user !== '*') {
    restQuery.user = user
  }

  const model = models.Rules.forge()

  model.where(restQuery)

  const res = !limit && !pageSize
    ? await model.fetchAll({ require: false })
    : await model.fetchPage({
      require: false,
      pageSize,
      page,
      limit,
      offset
    })

  return res.toJSON()
}

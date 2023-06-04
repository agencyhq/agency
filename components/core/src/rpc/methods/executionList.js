import models from '../../models.js'

export default async (query, { user }) => {
  const res = await models.Executions.forge()
    .where({ user })
    .orderBy('created_at', 'DESC')
    .fetchPage(query)

  return res.toJSON()
}

import models from '../../models.js'
import pubsub from '../../pubsub.js'

export default async ({ id }, { user }) => {
  const query = { id, user }

  const mod = models.Rules.forge(query)
    .where({ user })
  await mod.destroy()

  const rule = {
    id,
    user,
    deleted: true
  }

  await pubsub.publish('rule', rule)

  return rule
}

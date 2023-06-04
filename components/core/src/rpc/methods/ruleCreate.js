import crypto from 'crypto'

import models from '../../models.js'
import pubsub from '../../pubsub.js'

export default async ({ code }, { user }) => {
  // TODO: makes sense to attempt to prevalidate code before saving it
  const mod = models.Rules.forge({
    id: crypto.randomBytes(16).toString('hex'),
    code,
    user
  })
  const rule = await mod.save(null, { method: 'insert' })
  await pubsub.publish('rule', rule.toJSON())

  return rule.toJSON()
}

import pubsub from '../../pubsub.js'

export default async ({ id, type, event }, { user }) => {
  const trigger = {
    id,
    type,
    event
  }

  if (user !== '*') {
    trigger.user = user
  }

  await pubsub.publish('trigger', trigger)
}

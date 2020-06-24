const pubsub = require('../../pubsub')

module.exports = (trigger, { user }) => {
  if (user !== '*') {
    trigger.user = user
  }
  pubsub.publish('trigger', trigger)
}

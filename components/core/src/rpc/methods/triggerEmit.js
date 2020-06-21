const pubsub = require('../../pubsub')

module.exports = (trigger, { user }) => {
  pubsub.publish('trigger', {
    ...trigger,
    user
  })
}

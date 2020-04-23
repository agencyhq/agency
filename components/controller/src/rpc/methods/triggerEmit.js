const pubsub = require('../../pubsub')

module.exports = trigger => {
  pubsub.publish('trigger', trigger)
}

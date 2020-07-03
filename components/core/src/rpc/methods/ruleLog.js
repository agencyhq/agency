const pubsub = require('../../pubsub')

module.exports = async ({ rule, args }, { user }) => {
  pubsub.publish('ruleLog', { rule, args, user })
}

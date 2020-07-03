const pubsub = require('../../pubsub')

module.exports = async ({ rule, trigger, error }, { user }) => {
  pubsub.publish('ruleError', { rule, trigger, error, user })
}

import pubsub from '../../pubsub.js'

export default async ({ rule, trigger, error }, { user }) => {
  pubsub.publish('ruleError', { rule, trigger, error, user })
}

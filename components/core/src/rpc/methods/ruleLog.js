import pubsub from '../../pubsub.js'

export default async ({ rule, args }, { user }) => {
  pubsub.publish('ruleLog', { rule, args, user })
}

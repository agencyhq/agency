import amqp from 'amqplib'

class PubSub {
  constructor (exchange, exchangeType, exchangeOpts) {
    this.exchange = exchange
    this.exchangeType = exchangeType
    this.exchangeOpts = exchangeOpts

    this.consumerTags = {}
  }

  async init () {
    if (!this.channel) {
      this.conn = await amqp.connect(process.env.AMQP_CONNECTION_STRING || 'amqp://localhost')
      this.channel = await this.conn.createChannel()
      await this.channel.assertExchange(this.exchange, this.exchangeType, this.exchangeOpts)
    }
  }

  publish (key, data) {
    return this.channel.publish(this.exchange, key, Buffer.from(JSON.stringify(data)))
  }

  isSubscribed (key) {
    return !!this.consumerTags[key]
  }

  async subscribe (key, fn, { name = key, ...opts } = {}) {
    if (this.consumerTags[key]) {
      throw new Error(`the key is already subscribed to: ${key}`)
    }
    const q = await this.channel.assertQueue(name, opts)
    await this.channel.bindQueue(q.queue, this.exchange, key)
    const { consumerTag } = await this.channel.consume(q.queue, fn)
    this.consumerTags[key] = consumerTag
  }

  async unsubscribe (key) {
    if (this.consumerTags[key]) {
      await this.channel.cancel(this.consumerTags[key])
      delete this.consumerTags[key]
    }
  }
}

export default new PubSub('ifttt', 'topic', {
  durable: true,
  autoDelete: true
})

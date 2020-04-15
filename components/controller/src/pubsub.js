const amqp = require('amqplib')

class PubSub {
  constructor (exchange, exchangeType, exchangeOpts) {
    this.exchange = exchange
    this.exchangeType = exchangeType
    this.exchangeOpts = exchangeOpts
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

  async subscribe (key, fn, { name = key, ...opts } = {}) {
    const q = await this.channel.assertQueue(name, opts)
    this.channel.bindQueue(q.queue, this.exchange, key)
    this.channel.consume(q.queue, fn)
  }
}

module.exports = new PubSub('ifttt', 'topic', {
  durable: true,
  autoDelete: true
})
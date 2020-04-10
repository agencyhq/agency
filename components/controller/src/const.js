module.exports = {
  TRIGGER_EXCHANGE_NAME: 'trigger_instance',
  TRIGGER_EXCHANGE_TYPE: 'topic',
  TRIGGER_EXCHANGE_OPTION: {
    durable: true,
    autoDelete: true
  },

  EXEC_EXCHANGE_NAME: 'execution',
  EXEC_EXCHANGE_TYPE: 'topic',
  EXEC_EXCHANGE_OPTION: {
    durable: true,
    autoDelete: true
  }
}

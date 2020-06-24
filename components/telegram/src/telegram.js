const crypto = require('crypto')

const Agent = require('socks5-https-client/lib/Agent')
const log = require('loglevel')
const metrics = require('@agencyhq/agency-metrics')
const RPC = require('@agencyhq/jsonrpc-ws')
const TelegramBot = require('node-telegram-bot-api')

const EVENT_TYPE = 'telegram'
const ACTION_TYPE = 'telegram'

log.setLevel(process.env.LOG_LEVEL || 'info')

const rpc = new RPC.Client(process.env.AGENCY_URL || 'ws://localhost:3000/')

metrics.instrumentRPCClient(rpc)

async function main () {
  const {
    PORT = 3000,
    METRICS = false,
    AGENCY_TOKEN,
    TELEGRAM_BOT_TOKEN
  } = process.env

  if (METRICS) {
    metrics.createServer(PORT)
  }

  rpc.on('disconnected', () => {
    process.exit(1)
  })

  await rpc.connect()
  await rpc.auth({ token: AGENCY_TOKEN })

  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
    polling: true,
    request: {
      agentClass: Agent,
      agentOptions: {
        socksHost: process.env.PROXY_SOCKS5_HOST,
        socksPort: parseInt(process.env.PROXY_SOCKS5_PORT)
      }
    }
  })

  bot.on('message', async (msg) => {
    const trigger = {
      id: crypto.randomBytes(16).toString('hex'),
      type: EVENT_TYPE,
      event: msg
    }

    // TODO: need to figure out a user the message to. '*' is not going to cut it here.
    await rpc.call('trigger.emit', trigger)
  })

  await rpc.subscribe('execution', async execution => {
    const { id, action, parameters, user } = execution
    log.debug('processing execution: %s', id)

    if (action !== ACTION_TYPE) {
      return
    }

    const claim = await rpc.call('execution.claim', { id }, { become: user })
    metrics.countClaims(claim)

    if (!claim.granted) {
      log.debug(`claim denied: ${id}`)
      return
    }

    log.debug(`claim granted: ${id}`)

    const {
      chatId,
      text
    } = parameters

    try {
      const result = await bot.sendMessage(chatId, text)

      log.info('execution completed successfully: %s', execution.id)

      await rpc.call('execution.completed', {
        id: execution.id,
        status: 'succeeded',
        result
      }, { become: user })
    } catch (e) {
      log.info('execution failed: %s', execution.id)

      await rpc.call('execution.completed', {
        id: execution.id,
        status: 'failed',
        result: e
      }, { become: user })
    }
  })

  await rpc.notify('ready')
}

module.exports = {
  main
}

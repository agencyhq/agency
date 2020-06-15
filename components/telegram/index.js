const crypto = require('crypto')

const Agent = require('socks5-https-client/lib/Agent')
const log = require('loglevel')
const metrics = require('@agencyhq/agency-metrics')
const RPC = require('@agencyhq/jsonrpc-ws')
const TelegramBot = require('node-telegram-bot-api')

const EVENT_TYPE = 'telegram'
const ACTION_TYPE = 'telegram'

const {
  AGENCY_TOKEN,
  TELEGRAM_BOT_TOKEN
} = process.env

log.setLevel(process.env.LOG_LEVEL || 'info')

const rpc = new RPC.Client(process.env.RPC_CONNECTION_STRING || 'ws://localhost:3000/')

metrics.instrumentRPCClient(rpc)

const {
  PORT = 3000,
  METRICS = false
} = process.env

if (METRICS) {
  metrics.createServer(PORT)
}

async function main () {
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

    await rpc.call('trigger.emit', trigger)
  })

  await rpc.subscribe('execution', async execution => {
    const { id, action, parameters } = execution
    log.debug('processing execution: %s', id)

    if (action !== ACTION_TYPE) {
      return
    }

    const claim = await rpc.call('execution.claim', { id })
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

    bot.sendMessage(chatId, text)
  })

  await rpc.notify('ready')

  log.info('ready to handle executions and emit triggers')
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

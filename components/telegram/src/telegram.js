import crypto from 'crypto'

import Agent from 'socks5-https-client/lib/Agent'
import log from 'loglevel'
import metrics from '@agencyhq/agency-metrics'
import RPC from '@agencyhq/jsonrpc-ws'
import TelegramBot from 'node-telegram-bot-api'

/**
 * The module acts as an adapter for Telegram. It interfaces with a single bot via provided token, converts every message the bot receives into separate trigger and transmits it to every user. It also acts as an actionrunner allowing bot to send back messages to chats that has already been established with it.
 *
 * Needless to say, in the current implementation one should not trust any secrets to the bot and should expect to get messages from other users he didn't specifically asked for. In other words, it is currently a security mess and there's no point dancing around it. Nonetheless, it is an important stepping stone for us in developing Agency.
 *
 * @module agencyhq/agency-telegram-adapter
 *
 * @param {string} [process.env.AGENCY_URL] - Agency RPC url.
 * @param {string} process.env.AGENCY_TOKEN - Agency RPC token. Should have `sensor` and `execution` scopes.
 * @param {string} [process.env.LOG_LEVEL=info] - Log level to output
 * @param {string} [process.env.METRICS] - Enable metrics endpoint
 * @param {string} [process.env.PORT=3000] - Port to bind HTTP server to
 *
 * @param {string} process.env.TELEGRAM_BOT_TOKEN - Token for a bot.
 * @param {string} [process.env.PROXY_SOCKS5_HOST] - SOCKS5 proxy host for connecting to Telegram.
 * @param {string} [process.env.PROXY_SOCKS5_PORT] - SOCKS5 proxy port.
 */

/**
 * The trigger gets emitted on every message bot sees.
 *
 * Properties listed below is just a subset of ones you might use frequently than others. For a fill list of properties, please consult [Telegram API](https://core.telegram.org/bots/api#message).
 *
 * @kind Agency.Trigger
 * @name telegram
 * @prop {number} message_id
 * @prop {object} [from]
 * @prop {number} from.id
 * @prop {string} from.first_name
 * @prop {string} [from.last_name]
 * @prop {string} [from.username]
 * @prop {number} date
 * @prop {object} chat
 * @prop {number} chat.id
 * @prop {ChatType} chat.type
 * @prop {string} [chat.title]
 * @prop {string} [chat.username]
 * @prop {string} [chat.first_name]
 * @prop {string} [chat.last_name]
 */
const EVENT_TYPE = 'telegram'

/**
 * The action sends a message to a specified chatId.
 *
 * @kind Agency.Action
 * @name telegram
 * @prop {string|number} chatId
 * @prop {string} text
 */
const ACTION_TYPE = 'telegram'

log.setLevel(process.env.LOG_LEVEL || 'info')

export const rpc = new RPC.Client(process.env.AGENCY_URL || 'ws://localhost:3000/')

metrics.instrumentRPCClient(rpc)

export async function main () {
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

export default {
  main
}

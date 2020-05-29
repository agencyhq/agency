const crypto = require('crypto')

const metrics = require('@agencyhq/agency-metrics')
const RPC = require('@agencyhq/jsonrpc-ws')
const log = require('loglevel')

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

const CORELATORS = [{
  id: crypto.randomBytes(16).toString('hex'),
  window: 10 * 1000,
  times: 3,
  hash: ({ type, event }) => type === 'http' && {
    type: event.body.type,
    url: event.body.url
  },
  emitter: ({ type, path }) => ({
    type: 'http-short-burst',
    event: {
      path
    }
  })
}, {
  id: crypto.randomBytes(16).toString('hex'),
  window: 15 * 1000,
  times: 5,
  hash: ({ type, event }) => type === 'http' && {
    type: event.body.type,
    url: event.body.url
  },
  emitter: ({ type, path }) => ({
    type: 'http-medium-burst',
    event: {
      path
    }
  })
}, {
  id: crypto.randomBytes(16).toString('hex'),
  window: 20 * 1000,
  times: 10,
  hash: ({ type, event }) => type === 'http' && {
    type: event.body.type,
    url: event.body.url
  },
  emitter: ({ type, path }) => ({
    type: 'http-long-burst',
    event: {
      path
    }
  })
}]

const STACK = new Map()

async function handleTrigger (trigger) {
  log.debug('processing trigger: %s', trigger)

  const now = Date.now()

  for (const core of CORELATORS) {
    const hash = core.hash(trigger)

    if (!hash) {
      continue
    }

    const key = JSON.stringify({
      id: core.id,
      ...hash
    })

    if (!STACK.has(key)) {
      STACK.set(key, [now])
      continue
    }

    const invocations = STACK.get(key)

    invocations.filter(datetime => now - datetime < core.window)

    invocations.push(now)

    if (invocations.length >= core.times) {
      log.info('condition for corelation %s has been fulfilled', core.id)
      STACK.set(key, [])
      const trigger = core.emitter(hash)
      trigger.id = crypto.randomBytes(16).toString('hex')
      log.debug('emitting trigger: %s', trigger)
      rpc.call('trigger.emit', trigger)
    } else {
      STACK.set(key, invocations)
    }
  }
}

async function main () {
  await rpc.connect()
  await rpc.auth({ token: 'sensorruletoken' })

  await rpc.subscribe('trigger', handleTrigger)

  await rpc.notify('ready')
  log.info('ready to handle triggers')
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

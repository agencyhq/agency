const crypto = require('crypto')

const metrics = require('@agencyhq/agency-metrics')
const RPC = require('@agencyhq/jsonrpc-ws')
const cron = require('node-cron')
const log = require('loglevel')

log.setLevel(process.env.LOG_LEVEL || 'info')

const rpc = new RPC.Client(process.env.RPC_CONNECTION_STRING || 'ws://localhost:3000/')

metrics.instrumentRPCClient(rpc)

const {
  PORT = 3001,
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
  await rpc.auth({ token: 'sensortoken' })
  await rpc.notify('ready')

  cron.schedule('* * * * *', async () => {
    const date = new Date()
    const trigger = {
      id: crypto.randomBytes(16).toString('hex'),
      type: 'cron',
      event: {
        iso: date.toISOString(),
        date: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        hours: date.getHours(),
        minutes: date.getMinutes(),
        seconds: date.getSeconds()
      }
    }

    await rpc.call('trigger.emit', trigger)
  })

  log.info('ready to emit triggers')
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

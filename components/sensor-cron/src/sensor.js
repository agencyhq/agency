const crypto = require('crypto')

const metrics = require('@agencyhq/agency-metrics')
const RPC = require('@agencyhq/jsonrpc-ws')
const cron = require('node-cron')
const log = require('loglevel')

log.setLevel(process.env.LOG_LEVEL || 'info')

const rpc = new RPC.Client(process.env.AGENCY_URL || 'ws://localhost:3000/')

metrics.instrumentRPCClient(rpc)

const {
  PORT = 3001,
  METRICS = false,
  AGENCY_TOKEN
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
  await rpc.notify('ready')

  cron.schedule('* * * * *', async () => {
    const date = new Date()

    date.setMilliseconds(0)

    const trigger = {
      id: crypto.randomBytes(16).toString('hex'),
      type: 'cron',
      event: {
        iso: date.toISOString(),
        date: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        hours: date.getHours(),
        minutes: date.getMinutes()
      }
    }

    await rpc.call('trigger.emit', trigger)
  })
}

module.exports = {
  main
}

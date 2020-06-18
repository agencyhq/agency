const crypto = require('crypto')

const RPC = require('@agencyhq/jsonrpc-ws')

const rpc = new RPC.Client(process.env.RPC_CONNECTION_STRING || 'ws://localhost:1234/api')

async function timing (fn) {
  const start = process.hrtime()
  await fn()
  const [seconds, ns] = process.hrtime(start)
  const delta = seconds * 1e3 + ns * 1e-6
  return delta
}

async function cycle (n, fn, { timeFirst } = {}) {
  const results = []
  for (let i = 0; i < n; i++) {
    const delta = await timing(() => {
      results.push(fn(i))
    })

    if (timeFirst && i < timeFirst) {
      console.log('init-' + i, delta.toFixed(6))
    }
  }
  for (let i = 0; i < n; i++) {
    const delta = await timing(async () => {
      await results[i]
    })

    if (timeFirst && i < timeFirst) {
      console.log('await-' + i, delta.toFixed(6))
    }
  }
}

async function main () {
  rpc.on('disconnected', () => {
    console.log('disconnected')
    process.exit(1)
  })

  await rpc.connect()
  await rpc.auth({ token: 'sensortoken' })
  await rpc.notify('ready')

  async function makeCall () {
    const trigger = {
      id: crypto.randomBytes(16).toString('hex'),
      type: 'load',
      event: {}
    }

    await rpc.call('trigger.emit', trigger)
  }

  let i = 0
  setInterval(async () => {
    const n = i++
    console.time('cycle-' + n)
    await cycle(8000, makeCall)
    console.timeEnd('cycle-' + n)
  }, 1000)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })

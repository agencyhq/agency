const crypto = require('crypto')
const util = require('util')

const axios = require('axios').default
const log = require('loglevel')

const pubsub = require('../pubsub')

log.setLevel(process.env.LOG_LEVEL || 'info')

const SECONDS = 10
const ENDPOINT = 'http://localhost:4000/aggregates'

function groupBy (xs, key) {
  return xs.reduce((rv, x) => {
    (rv[x[key]] = rv[x[key]] || []).push(x)
    return rv
  }, {})
};

async function main () {
  await pubsub.init()

  setInterval(async () => {
    const now = +Date.now()
    const closestInterval = Math.ceil(now / (SECONDS * 1000))
    const since = (closestInterval - 3) * SECONDS - 1
    const until = (closestInterval - 1) * SECONDS - 1

    log.info(`fetching data between ${since} and ${until}`)

    const res = await axios
      .get(`${ENDPOINT}?since=${since}&until=${until}`)
      .catch(e => {
        log.error('unable to fetch the endpoint:', e.message)
      })

    if (!res) {
      return
    }

    const sensors = groupBy(res.data, 'sensorId')

    Object.keys(sensors)
      .forEach(sensorId => {
        const [last, previous] = sensors[sensorId]
        sensors[sensorId] = { last, previous }
      })

    const trigger = {
      id: crypto.randomBytes(16).toString('hex'),
      type: 'converge_sensor',
      event: {
        since,
        until,
        sensors
      }
    }

    log.debug(util.inspect(trigger, { depth: null }))
    pubsub.publish('trigger', trigger)
  }, SECONDS * 1000)
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

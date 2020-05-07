const express = require('express')
const log = require('loglevel')
const promMid = require('express-prometheus-middleware')
const Prometheus = require('prom-client')

const middleware = ({ prefix } = {}) => {
  Prometheus.collectDefaultMetrics()
  return promMid({
    metricsPath: '/metrics',
    collectDefaultMetrics: false,
    prefix
  })
}

function createMonitoringServer (port) {
  const app = express()
  app.use(middleware())
  app.listen(port, () => {
    log.info(`Listening on http://localhost:${port}`)
  })

  return app
}

module.exports = {
  createServer: createMonitoringServer,
  middleware
}

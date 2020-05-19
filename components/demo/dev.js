const path = require('path')

const proxy = require('http-proxy-middleware')
const Bundler = require('parcel-bundler')
const express = require('express')

const bundler = new Bundler(path.join(__dirname, 'web/index.html'))
const app = express()

app.use(
  '/api',
  proxy.createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    pathRewrite: {
      '^/api[/]*': ''
    },
    ws: true
  })
)

app.use(
  '/sensor',
  proxy.createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: {
      '^/sensor[/]*': ''
    }
  })
)

app.use(bundler.middleware())

app.listen(Number(process.env.PORT || 1234))

const proxy = require('http-proxy-middleware')
const Bundler = require('parcel-bundler')
const express = require('express')

const bundler = new Bundler('web/index.html')
const app = express()

app.use(
  '/api',
  proxy.createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    pathRewrite: {
      '^/api/': '/'
    }
  })
)

app.use(bundler.middleware())

app.listen(Number(process.env.PORT || 1234))

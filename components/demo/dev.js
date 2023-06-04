import path from 'path'

import proxy from 'http-proxy-middleware'
import Bundler from 'parcel-bundler'
import express from 'express'
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

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

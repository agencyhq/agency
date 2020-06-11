const axios = require('axios').default
const chai = require('chai')
const express = require('express')

const { expect } = chai
chai.use(require('sinon-chai'))

describe('RESTful', () => {
  const client = axios.create({
    baseURL: 'http://localhost:3000',
    headers: {
      authorization: 'bearer alltoken'
    }
  })

  describe('#/', () => {
    it('should return hello world string', async () => {
      const resp = await client.get('/')
      expect(resp.data).to.equal('Hello World')
    })
  })
})

describe('E2E', () => {
  const client = axios.create({
    baseURL: 'http://localhost:3001'
  })

  const app = express()
  let server

  beforeEach(() => {
    app.use(express.json())
    server = app.listen(2999)
  })

  afterEach(() => {
    server.close()
  })

  it('should make http call to mock server on http trigger', async () => {
    const mock = new Promise(resolve => {
      app.post('/fakeEndpoint', (req, res) => {
        res.status(204).send()
        resolve(req)
      })
    })

    const event = {
      type: 'e2e',
      url: 'http://localhost:2999/fakeEndpoint',
      payload: { a: 'b' }
    }

    const resp = await client.post('/http', event)
    expect(resp.data).to.equal('OK')

    const req = await mock
    expect(req.body).to.deep.equal({ a: 'b' })
  })

  it.skip('should test anything but the happiest of paths')
})

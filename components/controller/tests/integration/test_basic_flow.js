const axios = require('axios').default
const expect = require('chai').expect
const express = require('express')

describe('API', () => {
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

  it.skip('should have every method in openapi.yaml registered', () => {
    throw new Error('not implemented')
  })

  it.skip('should have every method in rpcapi.yaml registered', () => {
    throw new Error('not implemented')
  })
})

describe('Sensor', () => {
  const client = axios.create({
    baseURL: 'http://localhost:3001'
  })

  describe('#/http', () => {
    it('should return ok on POST', async () => {
      const resp = await client.post('/http', { a: 'b' })
      expect(resp.data).to.equal('OK')
    })

    it.skip('should notify api of new trigger', () => {
      throw new Error('not implemented')
    })
  })
})

describe('Ruleengine', () => {
  it.skip('should pull a list of rules', () => {
    throw new Error('not implemented')
  })
})

describe('Actionrunner', () => {
  it.skip('should listen for new executions', () => {
    throw new Error('not implemented')
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

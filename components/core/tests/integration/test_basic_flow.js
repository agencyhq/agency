const axios = require('axios').default
const chai = require('chai')
const express = require('express')
const sinon = require('sinon')

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
    const mock = sinon.spy()

    app.post('/fakeEndpoint', (req, res) => {
      mock(req.body)
      res.status(204).send()
    })

    const event = {
      type: 'e2e',
      url: 'http://localhost:2999/fakeEndpoint',
      payload: { a: 'b' }
    }

    const resp = await client.post('/http', event)
    expect(resp.data).to.equal('OK')

    await new Promise(resolve => setTimeout(resolve, 1000))

    expect(mock).to.be.calledOnce
    expect(mock.getCall(0).firstArg).to.have.property('a', 'b')
  }).slow(3000)

  it('should make two http calls to mock server on e2e-multiple trigger', async () => {
    const mock = sinon.spy()

    app.post('/fakeEndpointMulti', (req, res) => {
      mock(req.body)
      res.status(204).send()
    })

    const event = {
      type: 'e2e-multiple',
      url: 'http://localhost:2999/fakeEndpointMulti',
      payload: { a: 'b' }
    }

    const resp = await client.post('/http', event)
    expect(resp.data).to.equal('OK')

    await new Promise(resolve => setTimeout(resolve, 1000))

    expect(mock).to.be.calledTwice
    expect(mock.getCall(0).firstArg).to.have.property('a', 'b')
    expect(mock.getCall(0).firstArg).to.have.property('hash', 1)
    expect(mock.getCall(1).firstArg).to.have.property('a', 'b')
    expect(mock.getCall(1).firstArg).to.have.property('hash', 2)
  }).slow(3000)

  it.skip('should test anything but the happiest of paths')
})

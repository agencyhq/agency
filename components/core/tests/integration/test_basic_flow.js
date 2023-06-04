import axios from 'axios'
import chai from 'chai'
import express from 'express'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'

const { expect } = chai
chai.use(sinonChai)

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
    expect(mock.getCalls().map(e => e.firstArg)).to.have.deep.members([{ a: 'b', hash: 2 }, { a: 'b', hash: 1 }])
  }).slow(3000)

  it.skip('should test anything but the happiest of paths')
})

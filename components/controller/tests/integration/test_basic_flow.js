const axios = require('axios').default
const chai = require('chai')
const express = require('express')
const sinon = require('sinon')

const { expect } = chai
chai.use(require('sinon-chai'))

const RPC = require('@agencyhq/jsonrpc-ws')

function promiseCalledMatching (match) {
  const fn = sinon.stub()

  fn.promise = new Promise(resolve => {
    fn.callsFake((...args) => { match(...args) && resolve() })
  })

  return fn
}

async function ensureRuleCreation (rpc, rule) {
  let res = {}
  const fn = promiseCalledMatching(r => r.id === res.id)

  await rpc.subscribe('rule', fn)

  res = await rpc.call('rule.create', rule)
  await fn.promise

  await rpc.unsubscribe('rule', fn)

  return res
}

async function ensureRuleDeletion (rpc, rule) {
  const fn = promiseCalledMatching(r => r.id === rule.id && r.deleted === true)

  await rpc.subscribe('rule', fn)

  await rpc.call('rule.delete', rule)
  await fn.promise

  await rpc.unsubscribe('rule', fn)
}

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

  it.skip('should have every method in openapi.yaml registered', () => {
    throw new Error('not implemented')
  })

  it.skip('should have every method in rpcapi.yaml registered', () => {
    throw new Error('not implemented')
  })
})

describe.only('RPC', () => {
  let rpc

  before(async () => {
    rpc = new RPC.Client(process.env.RPC_CONNECTION_STRING || 'ws://localhost:3000/')

    await rpc.connect()
    await rpc.auth({ token: 'alltoken' })
  })

  describe('#rpc.ruleList', () => {
    it('should list registered rules', async () => {
      const rules = await rpc.call('rule.list')

      expect(rules).to.be.an('array')
      expect(rules[0]).to.be.an('object')
        .and.have.all.keys('id', 'code', 'created_at', 'updated_at')
    })
  })

  describe('#ruleCreate', () => {
    it('should create a rule', async () => {
      const rule = {
        code: '{ if: () => false, then: () => ({}) }'
      }

      const res = await rpc.call('rule.create', rule)

      try {
        expect(res).to.have.property('code', rule.code)
        expect(res).to.have.property('id')
        expect(res).to.have.property('created_at')
        expect(+new Date(res.created_at)).to.be.closeTo(+Date.now(), 1000)
        expect(res).to.have.property('updated_at', res.created_at)
      } finally {
        await ensureRuleDeletion(rpc, res)
      }
    })

    it('should notify on rule creation', async () => {
      const fn = promiseCalledMatching(r => r.id === res.id)

      await rpc.subscribe('rule', fn)

      const rule = {
        code: '{ if: () => false, then: () => ({}) }'
      }

      const res = await rpc.call('rule.create', rule)

      await fn.promise

      try {
        expect(res).to.have.property('code', rule.code)
        expect(fn).to.be.calledOnceWith(sinon.match(res))
      } finally {
        await rpc.unsubscribe('rule', fn)
        await ensureRuleDeletion(rpc, res)
      }
    })
  })

  describe('#ruleUpdate', () => {
    let rule

    beforeEach(async () => {
      rule = await ensureRuleCreation(rpc, {
        code: '{ if: () => false, then: () => ({}) }'
      })
    })

    afterEach(async () => {
      try {
        await await ensureRuleDeletion(rpc, rule)
      } catch (e) {}
    })

    it('should update a rule', async () => {
      const update = {
        id: rule.id,
        code: '{ if: () => false, then: () => ({}), updated: true }'
      }

      const res = await rpc.call('rule.update', update)

      expect(res).to.have.property('code', update.code)
      expect(res).to.have.property('id', update.id)
      expect(res).to.have.property('updated_at')
      expect(+new Date(res.updated_at)).to.be.closeTo(+Date.now(), 1000)
      expect(res).to.have.property('created_at').that.is.not.equal(res.updated_at)
    })

    it('should notify on rule update', async () => {
      let res = {}
      const fn = promiseCalledMatching(r => r.id === res.id)

      await rpc.subscribe('rule', fn)

      const update = {
        id: rule.id,
        code: '{ if: () => false, then: () => ({}), updated: true }'
      }

      res = await rpc.call('rule.update', update)

      await fn.promise

      try {
        expect(res).to.have.property('code', update.code)
        expect(fn).to.be.calledOnceWith(sinon.match(res))
      } finally {
        await rpc.unsubscribe('rule', fn)
      }
    })
  })

  describe('#ruleDelete', () => {
    let rule

    beforeEach(async () => {
      rule = await ensureRuleCreation(rpc, {
        code: '{ if: () => false, then: () => ({}) }'
      })
    })

    afterEach(async () => {
      try {
        await ensureRuleDeletion(rpc, rule)
      } catch (e) {}
    })

    it('should delete a rule', async () => {
      const res = await rpc.call('rule.delete', rule)

      expect(res).to.have.property('deleted', true)
      expect(res).to.have.property('id', rule.id)
    })

    it('should notify on rule delete', async () => {
      const fn = promiseCalledMatching(r => r.id === res.id && r.deleted === true)

      await rpc.subscribe('rule', fn)

      const res = await rpc.call('rule.delete', { id: rule.id })

      await fn.promise

      try {
        expect(res).to.have.property('id', rule.id)
        expect(res).to.have.property('deleted', true)
        expect(fn).to.be.calledOnceWith(sinon.match(res))
      } finally {
        await rpc.unsubscribe('rule', fn)
      }
    })
  })

  after(async () => {
    await rpc.close()
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

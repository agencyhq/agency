const chai = require('chai')
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

describe('RPC', () => {
  let rpc
  let identity

  before(async () => {
    rpc = new RPC.Client(process.env.RPC_CONNECTION_STRING || 'ws://localhost:3000/')

    await rpc.connect()
    await rpc.auth({ token: 'alltoken' })

    identity = await rpc.call('token.create', {
      user: 'testrunner',
      meta: {
        scopes: ['all']
      }
    })

    await rpc.auth({ token: identity.id })
  })

  after(async () => {
    await rpc.call('token.delete', identity)
  })

  describe('#rpc.ruleList', () => {
    it('should list registered rules', async () => {
      const rules = await rpc.call('rule.list')

      expect(rules).to.be.an('array')
      expect(rules[0]).to.be.an('object')
        .and.have.all.keys('id', 'code', 'created_at', 'updated_at', 'user')
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
        expect(res).to.have.property('user', 'testrunner')
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
        expect(res).to.have.property('user', 'testrunner')
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
      expect(res).to.have.property('user', 'testrunner')
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
        expect(res).to.have.property('user', 'testrunner')
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
      expect(res).to.have.property('user', 'testrunner')
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

    describe('#tokenList', () => {
      it('should list all tokens', async () => {
        const res = await rpc.call('token.list')

        expect(res).to.be.an('array')
        expect(res[0]).to.have.all.keys('id', 'user', 'meta', 'created_at', 'created_by')
      })
    })

    describe('#tokenCreate', () => {
      it('should create a token', async () => {
        const identity = {
          user: 'test',
          meta: {
            scopes: ['testscope']
          }
        }

        const res = await rpc.call('token.create', identity)

        try {
          expect(res).to.have.property('id')
          expect(res).to.have.property('user', identity.user)
          expect(res).to.have.nested.property('meta.scopes').that.is.deep.equal(identity.meta.scopes)
        } finally {
          await rpc.call('token.delete', res)
        }
      })
    })

    describe('#tokenDelete', () => {
      it('should delete a token', async () => {
        const identity = await rpc.call('token.create', { user: 'test', meta: { scopes: [] } })

        const res = await rpc.call('token.delete', identity)

        expect(res).to.have.property('id', identity.id)
        expect(res).to.have.property('deleted', true)
      })
    })
  })

  after(async () => {
    await rpc.close()
  })
})

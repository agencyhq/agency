const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const knex = require('knex')
const mockDb = require('mock-knex')
const sinon = require('sinon')

const models = require('../../src/models')
const pubsub = require('../../src/pubsub')
const executionClaim = require('../../src/rpc/methods/executionClaim')
const executionCompleted = require('../../src/rpc/methods/executionCompleted')
const executionList = require('../../src/rpc/methods/executionList')
const executionRequest = require('../../src/rpc/methods/executionRequest')
const executionSchedule = require('../../src/rpc/methods/executionSchedule')
const executionStarted = require('../../src/rpc/methods/executionStarted')
const ruleCreate = require('../../src/rpc/methods/ruleCreate')
const ruleDelete = require('../../src/rpc/methods/ruleDelete')
const ruleList = require('../../src/rpc/methods/ruleList')
const ruleUpdate = require('../../src/rpc/methods/ruleUpdate')
const triggerEmit = require('../../src/rpc/methods/triggerEmit')

const { expect } = chai
chai.use(chaiAsPromised)
chai.use(require('sinon-chai'))

const db = knex({
  client: 'pg'
})

mockDb.mock(models.knex)
mockDb.mock(db)
const tracker = mockDb.getTracker()

const sandbox = sinon.createSandbox()

describe('RPC Methods', () => {
  const user = 'testuser'

  beforeEach(() => {
    tracker.install()
  })

  afterEach(() => {
    tracker.uninstall()
    sandbox.restore()
  })

  describe('#executionClaim', () => {
    it('is a function', () => {
      expect(executionClaim).to.be.a('function')
    })

    it('grants claim if db request succeeds', async () => {
      tracker.on('query', q => {
        q.response({})
      })

      const res = await executionClaim({ id: 1 }, { user })

      expect(res).to.be.deep.equal({ granted: true })
      expect(tracker.queries.count()).to.be.equal(2)
      expect(tracker.queries.first()).to.have.property('method', 'update')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [user, 'claimed', 'scheduled', 1])
    })

    it('denies claim if db request fails', async () => {
      tracker.on('query', q => {
        q.reject('error')
      })

      const res = await executionClaim({ id: 1 }, { user })

      expect(res).to.be.deep.equal({ granted: false })
      expect(tracker.queries.count()).to.be.equal(1)
      expect(tracker.queries.first()).to.have.property('method', 'update')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [user, 'claimed', 'scheduled', 1])
    })
  })

  describe('#executionCompleted', () => {
    it('is a function', () => {
      expect(executionCompleted).to.be.a('function')
    })

    it('saves execution results to db', async () => {
      tracker.on('query', q => {
        q.response({})
      })

      const res = await executionCompleted({ id: 1, status: 'succeeded' }, { user })

      expect(res).to.be.true
      expect(tracker.queries.count()).to.be.equal(2)
      expect(tracker.queries.first()).to.have.property('method', 'insert')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [1, 'succeeded', user])
    })
  })

  describe('#executionList', () => {
    it('is a function', () => {
      expect(executionList).to.be.a('function')
    })

    it('lists a set of documents from db', async () => {
      tracker.on('query', q => {
        q.response([{}, {}, {}])
      })

      const res = await executionList({}, { user })

      expect(res).to.be.deep.equal([{}, {}, {}])
      expect(tracker.queries.count()).to.be.equal(2)
      expect(tracker.queries.first()).to.have.property('method', 'select')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [user, 10])
    })
  })

  describe('#executionRequest', () => {
    it('is a function', () => {
      expect(executionRequest).to.be.a('function')
    })

    it('creates an execution', async () => {
      tracker.on('query', q => {
        q.response({})
      })

      const res = await executionRequest({
        triggered_by: 'some',
        matched_to: 'thing'
      }, { user })

      expect(res).to.be.deep.equal({
        created_at: res.created_at,
        hash: null,
        id: res.id,
        matched_to: 'thing',
        status: 'requested',
        triggered_by: 'some',
        user
      })
      expect(tracker.queries.count()).to.be.equal(2)
      expect(tracker.queries.first()).to.have.property('method', 'insert')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [
        res.created_at, null, res.id, 'thing', 'requested', 'some', user
      ])
    })
  })

  describe('#executionSchedule', () => {
    it('is a function', () => {
      expect(executionSchedule).to.be.a('function')
    })

    it('schedules an execution', async () => {
      tracker.on('query', q => {
        q.response({})
      })

      sandbox.stub(pubsub, 'publish').resolves()

      const res = await executionSchedule({
        id: 'deadbeef',
        action: 'testaction',
        parameters: {
          a: 'b'
        }
      }, { user })

      expect(res).to.be.deep.equal({
        id: 'deadbeef',
        action: 'testaction',
        parameters: {
          a: 'b'
        },
        status: 'scheduled',
        updated_at: res.updated_at
      })
      expect(tracker.queries.count()).to.be.equal(2)
      expect(tracker.queries.first()).to.have.property('method', 'update')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [
        res.updated_at, 'scheduled', 'testaction', { a: 'b' }, user, 'deadbeef'
      ])
      expect(pubsub.publish).to.be.calledOnceWith('execution', {
        action: 'testaction',
        id: 'deadbeef',
        parameters: { a: 'b' },
        status: 'scheduled',
        updated_at: res.updated_at
      })
    })
  })

  describe('#executionStarted', () => {
    it('is a function', () => {
      expect(executionStarted).to.be.a('function')
    })

    it('mark execution as started', async () => {
      tracker.on('query', q => {
        q.response({})
      })

      const res = await executionStarted({
        id: 'deadbeef'
      }, { user })

      expect(res).to.be.deep.equal({
        id: res.id,
        status: 'running'
      })
      expect(tracker.queries.count()).to.be.equal(2)
      expect(tracker.queries.first()).to.have.property('method', 'update')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [
        'running', 'claimed', user, 'deadbeef'
      ])
    })
  })

  describe('#ruleCreate', () => {
    it('is a function', () => {
      expect(ruleCreate).to.be.a('function')
    })

    it('creates a rule', async () => {
      tracker.on('query', q => {
        q.response({})
      })

      sandbox.stub(pubsub, 'publish').resolves()

      const res = await ruleCreate({
        id: 'deadbeef',
        code: '// some code'
      }, { user })

      expect(res).to.be.deep.equal({
        id: res.id,
        code: '// some code',
        user
      })
      expect(tracker.queries.count()).to.be.equal(2)
      expect(tracker.queries.first()).to.have.property('method', 'insert')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [
        '// some code', res.id, user
      ])
      expect(pubsub.publish).to.be.calledOnceWith('rule', {
        code: '// some code',
        id: res.id,
        user
      })
    })
  })

  describe('#ruleDelete', () => {
    it('is a function', () => {
      expect(ruleDelete).to.be.a('function')
    })

    it('deletes a rule', async () => {
      tracker.on('query', q => {
        q.response({})
      })

      sandbox.stub(pubsub, 'publish').resolves()

      const res = await ruleDelete({
        id: 'deadbeef'
      }, { user })

      expect(res).to.be.deep.equal({
        id: res.id,
        deleted: true,
        user
      })
      expect(tracker.queries.count()).to.be.equal(1)
      expect(tracker.queries.first()).to.have.property('method', 'del')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [
        user, 'deadbeef'
      ])
      expect(pubsub.publish).to.be.calledOnceWith('rule', {
        deleted: true,
        id: 'deadbeef',
        user
      })
    })
  })

  describe('#ruleList', () => {
    it('is a function', () => {
      expect(ruleList).to.be.a('function')
    })

    it('list rules', async () => {
      tracker.on('query', q => {
        q.response([{}, {}, {}])
      })

      const res = await ruleList(undefined, { user })

      expect(res).to.be.deep.equal([{}, {}, {}])
      expect(tracker.queries.count()).to.be.equal(1)
      expect(tracker.queries.first()).to.have.property('method', 'select')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [
        user
      ])
    })

    it('fetches a single page of rules', async () => {
      tracker.on('query', q => {
        q.response([{}, {}, {}])
      })

      const res = await ruleList({ pageSize: 10 }, { user })

      expect(res).to.be.deep.equal([{}, {}, {}])
      expect(tracker.queries.count()).to.be.equal(2)
      expect(tracker.queries.first()).to.have.property('method', 'select')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [
        user, 10
      ])
    })

    it('list rules for all users', async () => {
      tracker.on('query', q => {
        q.response([{}, {}, {}])
      })

      const res = await ruleList({}, { user: '*' })

      expect(res).to.be.deep.equal([{}, {}, {}])
      expect(tracker.queries.count()).to.be.equal(1)
      expect(tracker.queries.first()).to.have.property('method', 'select')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [])
    })

    it('returns empty list if no rules has been found', async () => {
      tracker.on('query', q => {
        q.response()
      })

      const res = await ruleList({}, { user })

      expect(res).to.be.deep.equal([])
      expect(tracker.queries.count()).to.be.equal(1)
      expect(tracker.queries.first()).to.have.property('method', 'select')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [
        user
      ])
    })
  })

  describe('#ruleUpdate', () => {
    it('is a function', () => {
      expect(ruleUpdate).to.be.a('function')
    })

    it('updates a rule', async () => {
      tracker.on('query', q => {
        q.response({})
      })

      sandbox.stub(pubsub, 'publish').resolves()

      const res = await ruleUpdate({
        id: 'deadbeef',
        code: '// some other code'
      }, { user })

      expect(res).to.be.deep.equal({
        id: res.id,
        code: '// some other code',
        updated_at: res.updated_at,
        user
      })
      expect(tracker.queries.count()).to.be.equal(2)
      expect(tracker.queries.first()).to.have.property('method', 'update')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [
        '// some other code', user, res.updated_at, 'deadbeef'
      ])
      expect(pubsub.publish).to.be.calledOnceWith('rule', {
        code: '// some other code',
        id: 'deadbeef',
        updated_at: res.updated_at,
        user
      })
    })
  })

  describe('#triggerEmit', () => {
    it('is a function', () => {
      expect(triggerEmit).to.be.a('function')
    })

    it('emits an event', async () => {
      sandbox.stub(pubsub, 'publish').resolves()

      const res = await triggerEmit({
        id: 'deadbeef',
        type: 'testevent',
        event: {
          a: 'b'
        }
      }, { user })

      expect(res).to.be.undefined
      expect(pubsub.publish).to.be.calledOnceWith('trigger', {
        id: 'deadbeef',
        type: 'testevent',
        event: {
          a: 'b'
        },
        user
      })
    })

    it('emits an event for all users', async () => {
      sandbox.stub(pubsub, 'publish').resolves()

      const res = await triggerEmit({
        id: 'deadbeef',
        type: 'testevent',
        event: {
          a: 'b'
        }
      }, { user: '*' })

      expect(res).to.be.undefined
      expect(pubsub.publish).to.be.calledOnceWith('trigger', {
        id: 'deadbeef',
        type: 'testevent',
        event: {
          a: 'b'
        }
      })
    })
  })
})

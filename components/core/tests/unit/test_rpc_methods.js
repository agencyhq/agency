const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const knex = require('knex')
const mockDb = require('mock-knex')

const models = require('../../src/models')
const executionClaim = require('../../src/rpc/methods/executionClaim')
const executionCompleted = require('../../src/rpc/methods/executionCompleted')
const executionList = require('../../src/rpc/methods/executionList')
const executionRequest = require('../../src/rpc/methods/executionRequest')
const executionSchedule = require('../../src/rpc/methods/executionSchedule')
const executionStarted = require('../../src/rpc/methods/executionStarted')

const { expect } = chai
chai.use(chaiAsPromised)
chai.use(require('sinon-chai'))

const db = knex({
  client: 'pg'
})

mockDb.mock(models.knex)
mockDb.mock(db)
const tracker = mockDb.getTracker()

describe('RPC Methods', () => {
  const user = 'testuser'

  beforeEach(() => {
    tracker.install()
  })

  afterEach(() => {
    tracker.uninstall()
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
        id: res.id,
        matched_to: 'thing',
        status: 'requested',
        triggered_by: 'some',
        user
      })
      expect(tracker.queries.count()).to.be.equal(2)
      expect(tracker.queries.first()).to.have.property('method', 'insert')
      expect(tracker.queries.first()).to.have.deep.property('bindings', [
        res.created_at, res.id, 'thing', 'requested', 'some', user
      ])
    })
  })

  describe('#executionSchedule', () => {
    it('is a function', () => {
      expect(executionSchedule).to.be.a('function')
    })
  })

  describe('#executionStarted', () => {
    it('is a function', () => {
      expect(executionStarted).to.be.a('function')
    })
  })
})

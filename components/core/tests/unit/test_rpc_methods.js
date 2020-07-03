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

function serializeQuery ({ sql, bindings }) {
  return sql.replace(/\$(\d)/g, (_, match) => {
    return `"${bindings[match - 1]}"`
  })
}

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
      let updatedAt
      tracker.on('query', q => {
        if (q.step === 1) {
          updatedAt = q.bindings[1]
        }
        q.response({})
      })

      const res = await executionClaim({ id: 1 }, { user })

      expect(res).to.be.deep.equal({ granted: true })
      expect(tracker.queries.queries.map(q => serializeQuery(q))).to.be.deep.equal([
        `update "executions" set "status" = "claimed", "updated_at" = "${updatedAt}" where "status" = "scheduled" and "user" = "${user}" and "id" = "1" returning *`,
        'select "executions".* from "executions" where "executions"."id" = "1" limit "1"'
      ])
    })

    it('denies claim if db request fails', async () => {
      let updatedAt
      tracker.on('query', q => {
        if (q.step === 1) {
          updatedAt = q.bindings[1]
        }
        q.reject('error')
      })

      const res = await executionClaim({ id: 1 }, { user })

      expect(res).to.be.deep.equal({ granted: false })
      expect(tracker.queries.queries.map(q => serializeQuery(q))).to.be.deep.equal([
        `update "executions" set "status" = "claimed", "updated_at" = "${updatedAt}" where "status" = "scheduled" and "user" = "${user}" and "id" = "1" returning *`
      ])
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

      sandbox.stub(pubsub, 'publish').resolves()

      const res = await executionCompleted({ id: 1, status: 'succeeded', result: 'some' }, { user })

      expect(res).to.be.deep.equal({
        id: 1,
        status: 'completed',
        updated_at: res.updated_at
      })
      expect(tracker.queries.queries.map(q => serializeQuery(q))).to.be.deep.equal([
        'BEGIN;',
        `update "executions" set "updated_at" = "${res.updated_at}", "status" = "completed" where "user" = "${user}" and "status" = "running" and "id" = "1" returning *`,
        'select "executions".* from "executions" where "executions"."id" = "1" limit "1"',
        `insert into "results" ("id", "result", "status", "user") values ("1", ""some"", "succeeded", "${user}") returning *`,
        'select "results".* from "results" where "results"."id" = "1" limit "1"',
        'COMMIT;'
      ])
      expect(pubsub.publish).to.be.calledOnceWith('result', {
        id: 1,
        result: 'some',
        status: 'succeeded',
        user: 'testuser'
      })
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
      expect(tracker.queries.queries.map(q => serializeQuery(q))).to.be.deep.equal([
        `select "executions".* from "executions" where "user" = "${user}" order by "executions"."created_at" DESC limit "10"`,
        `select count(distinct "executions"."id") from "executions" where "user" = "${user}"`
      ])
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
      expect(tracker.queries.queries.map(q => serializeQuery(q))).to.be.deep.equal([
        `insert into "executions" ("created_at", "hash", "id", "matched_to", "status", "triggered_by", "user") values ("${res.created_at}", "null", "${res.id}", "thing", "requested", "some", "${user}") returning *`,
        `select "executions".* from "executions" where "executions"."id" = "${res.id}" limit "1"`
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
      expect(tracker.queries.queries.map(q => serializeQuery(q))).to.be.deep.equal([
        `update "executions" set "updated_at" = "${res.updated_at}", "status" = "scheduled", "action" = "testaction", "parameters" = "{"a":"b"}" where "user" = "${user}" and "id" = "deadbeef" returning *`,
        `select "executions".* from "executions" where "executions"."id" = "${res.id}" limit "1"`
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
        status: 'running',
        updated_at: res.updated_at
      })
      expect(tracker.queries.queries.map(q => serializeQuery(q))).to.be.deep.equal([
        `update "executions" set "updated_at" = "${res.updated_at}", "status" = "running" where "status" = "claimed" and "user" = "${user}" and "id" = "deadbeef" returning *`,
        `select "executions".* from "executions" where "executions"."id" = "${res.id}" limit "1"`
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
      expect(tracker.queries.queries.map(q => serializeQuery(q))).to.be.deep.equal([
        `insert into "rules" ("code", "id", "user") values ("// some code", "${res.id}", "${user}") returning *`,
        `select "rules".* from "rules" where "rules"."id" = "${res.id}" limit "1"`
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
      expect(tracker.queries.queries.map(q => serializeQuery(q))).to.be.deep.equal([
        `delete from "rules" where "user" = "${user}" and "id" = "deadbeef"`
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
      expect(tracker.queries.queries.map(q => serializeQuery(q))).to.be.deep.equal([
        `select "rules".* from "rules" where "user" = "${user}"`
      ])
    })

    it('fetches a single page of rules', async () => {
      tracker.on('query', q => {
        q.response([{}, {}, {}])
      })

      const res = await ruleList({ pageSize: 10 }, { user })

      expect(res).to.be.deep.equal([{}, {}, {}])
      expect(tracker.queries.queries.map(q => serializeQuery(q))).to.be.deep.equal([
        `select "rules".* from "rules" where "user" = "${user}" limit "10"`,
        `select count(distinct "rules"."id") from "rules" where "user" = "${user}"`
      ])
    })

    it('list rules for all users', async () => {
      tracker.on('query', q => {
        q.response([{}, {}, {}])
      })

      const res = await ruleList({}, { user: '*' })

      expect(res).to.be.deep.equal([{}, {}, {}])
      expect(tracker.queries.queries.map(q => serializeQuery(q))).to.be.deep.equal([
        'select "rules".* from "rules"'
      ])
    })

    it('returns empty list if no rules has been found', async () => {
      tracker.on('query', q => {
        q.response()
      })

      const res = await ruleList({}, { user })

      expect(res).to.be.deep.equal([])
      expect(tracker.queries.queries.map(q => serializeQuery(q))).to.be.deep.equal([
        `select "rules".* from "rules" where "user" = "${user}"`
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
      expect(tracker.queries.queries.map(q => serializeQuery(q))).to.be.deep.equal([
        `update "rules" set "code" = "// some other code", "user" = "${user}", "updated_at" = "${res.updated_at}" where "id" = "deadbeef" returning *`,
        `select "rules".* from "rules" where "rules"."id" = "${res.id}" limit "1"`
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

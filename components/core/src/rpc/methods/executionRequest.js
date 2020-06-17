/* eslint-disable camelcase */
const crypto = require('crypto')
const log = require('loglevel')

const models = require('../../models')

module.exports = async ({ triggered_by, matched_to, hash = null }, { user }) => {
  const mod = models.Executions.forge({
    id: crypto.randomBytes(16).toString('hex'),
    created_at: new Date().toISOString(),
    status: 'requested',
    triggered_by,
    matched_to,
    hash,
    user
  })
  // TODO: this line throws error in postgres log every time the conflict happens. And the conflicts here are pretty much expected and intentional. There is a construct `... ON CONFLICT DO NOTHING`, but it's currently impossible to implement it in knex. PR's pending https://github.com/knex/knex/pull/3763
  const res = await mod.save(null, { method: 'insert' })
  log.debug(
    'execution requested for trigger %s and rule %s with id %s',
    triggered_by,
    matched_to,
    res.id
  )
  return res.toJSON()
}

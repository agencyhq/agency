/* eslint-disable camelcase */
const crypto = require('crypto')
const log = require('loglevel')

const models = require('../../models')

module.exports = async ({ triggered_by, matched_to }) => {
  const mod = models.Executions.forge({
    id: crypto.randomBytes(16).toString('hex'),
    created_at: new Date().toISOString(),
    status: 'requested',
    triggered_by,
    matched_to
  })
  const res = await mod.save(null, { method: 'insert' })
  log.debug(
    'execution requested for trigger %s and rule %s with id %s',
    triggered_by,
    matched_to,
    res.id
  )
  return res
}

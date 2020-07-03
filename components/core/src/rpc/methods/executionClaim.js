const log = require('loglevel')
const models = require('../../models')

module.exports = async ({ id }, { user }) => {
  try {
    await models.Executions.forge({ id, user })
      .where('status', 'scheduled')
      .save({
        updated_at: new Date().toISOString(),
        status: 'claimed'
      })
  } catch (e) {
    log.debug(`claim denied: ${id}`)
    return {
      granted: false
    }
  }

  log.debug(`claim granted: ${id}`)
  return {
    granted: true
  }
}

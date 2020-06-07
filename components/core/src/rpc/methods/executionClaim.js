const log = require('loglevel')
const models = require('../../models')

module.exports = async ({ id }) => {
  try {
    await models.Executions.forge({ id })
      .where('status', 'scheduled')
      .save({
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

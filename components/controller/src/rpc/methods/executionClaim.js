const log = require('loglevel')
const models = require('../../models')

module.exports = async ({ id }) => {
  try {
    await models.Executions.forge({ id })
      .where('status', 'requested')
      .save({
        status: 'claimed'
      })
  } catch (e) {
    log.info(`claim denied: ${id}`)
    return {
      granted: false
    }
  }

  log.info(`claim granted: ${id}`)
  return {
    granted: true
  }
}

import log from 'loglevel'
import models from '../../models.js'

export default async ({ id }, { user }) => {
  try {
    await models.Executions.forge({ id })
      .where({
        status: 'scheduled',
        user
      })
      .save({
        status: 'claimed',
        updated_at: new Date().toISOString()
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

const crypto = require('crypto')

exports.seed = async knex => {
  await knex('rules').del()
  await knex('rules').insert([{
    id: crypto.randomBytes(16).toString('hex'),
    if: `trigger.type === 'http'
      && trigger.event.body.type === 'e2e'`,
    then: `({
      action: 'http',
      parameters: {
        url: trigger.event.body.url,
        payload: trigger.event.body.payload
      }
    })`
  }, {
    id: crypto.randomBytes(16).toString('hex'),
    if: `trigger.type === 'http'
      && trigger.event.body.type === 'web'`,
    then: `({
      action: 'http',
      parameters: {
        url: trigger.event.body.url,
        payload: trigger.event.body.payload
      }
    })`
  }])
}

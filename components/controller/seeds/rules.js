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
  }, {
    id: crypto.randomBytes(16).toString('hex'),
    if: `
    sensor = 'sensor1'
    critical_temp = 10
    trigger.type === 'converge_sensor'
      && trigger.event.sensors[sensor].last.value_avg >= critical_temp
      && trigger.event.sensors[sensor].previous.value_avg < critical_temp`,
    then: `({
      action: 'http',
      parameters: {
        url: 'https://httpbin.org/post',
        payload: {
          message: \`sensor \${sensor} reached critical temperature of \${critical_temp}\`
        }
      }
    })`
  }])
}

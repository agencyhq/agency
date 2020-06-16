const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

exports.seed = async knex => {
  await knex('rules').del()
  await knex('rules').insert([{
    id: crypto.randomBytes(16).toString('hex'),
    code: fs.readFileSync(path.join(__dirname, 'rules/http_e2e.js')),
    user: 'enykeev'
  }, {
    id: crypto.randomBytes(16).toString('hex'),
    code: fs.readFileSync(path.join(__dirname, 'rules/http_e2e_multiple.js')),
    user: 'enykeev'
  }, {
    id: 'http-web',
    code: fs.readFileSync(path.join(__dirname, 'rules/http_web.js')),
    user: 'enykeev'
  }, {
    id: crypto.randomBytes(16).toString('hex'),
    code: fs.readFileSync(path.join(__dirname, 'rules/converge.js')),
    user: 'enykeev'
  }, {
    id: crypto.randomBytes(16).toString('hex'),
    code: fs.readFileSync(path.join(__dirname, 'rules/telegram_echo.js')),
    user: 'enykeev'
  }])
}

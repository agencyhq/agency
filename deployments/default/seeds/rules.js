import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export const seed = async knex => {
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
    id: 'http-any-action',
    code: fs.readFileSync(path.join(__dirname, 'rules/http_any_action.js')),
    user: 'enykeev'
  }, {
    id: 'http-log-message',
    code: fs.readFileSync(path.join(__dirname, 'rules/http_log_message.js')),
    user: 'enykeev'
  }, {
    id: 'http-error-message',
    code: fs.readFileSync(path.join(__dirname, 'rules/http_error_message.js')),
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

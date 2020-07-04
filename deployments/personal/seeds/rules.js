const fs = require('fs')
const path = require('path')

exports.seed = async knex => {
  await knex('rules').del()
  await knex('rules').insert([{
    id: 'telegram-echo',
    code: fs.readFileSync(path.join(__dirname, '../rules/telegram_echo.js')),
    user: 'enykeev'
  }])
}

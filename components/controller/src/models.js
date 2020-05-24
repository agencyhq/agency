const knexfile = require('../knexfile')
const knex = require('knex')(knexfile[process.env.NODE_ENV] || knexfile.development)

const bookshelf = require('bookshelf')(knex)

const Executions = bookshelf.model('Executions', {
  tableName: 'executions',
  result () {
    return this.hasOne('Results', 'id', 'id')
  }
})

const Results = bookshelf.model('Results', {
  tableName: 'results'
})

const Rules = bookshelf.model('Rules', {
  tableName: 'rules'
})

const Tokens = bookshelf.model('Tokens', {
  tableName: 'tokens'
})

module.exports = {
  knex,
  bookshelf,
  Executions,
  Results,
  Rules,
  Tokens
}

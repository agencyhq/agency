import knexfile from '../knexfile.js'
import Knex from 'knex'
import Bookshelf from 'bookshelf'

const knex = Knex(knexfile[process.env.NODE_ENV] || knexfile.development)
const bookshelf = Bookshelf(knex)

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

export default {
  knex,
  bookshelf,
  Executions,
  Results,
  Rules,
  Tokens
}

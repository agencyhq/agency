const path = require('path')

module.exports = {

  development: {
    client: 'pg',
    connection: {
      user: 'ifttt',
      password: 'mypassword',
      database: 'personal'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: path.join(__dirname, '../../components/core/migrations'),
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    }
  }
}

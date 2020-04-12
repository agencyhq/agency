module.exports = {

  development: {
    client: 'pg',
    connection: {
      user: 'postgres',
      password: 'mysecretpassword',
      database: 'postgres'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  staging: {
    client: 'pg',
    connection: process.env.PG_CONNECTION_STRING,
    migrations: {
      tableName: 'knex_migrations'
    }
  }
}

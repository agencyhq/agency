
exports.seed = async knex => {
  await knex('tokens').del()
  await knex('tokens').insert([
    {
      id: 'alltoken',
      user: 'enykeev',
      meta: {
        scopes: ['all']
      }
    }, {
      id: 'sensortoken',
      user: 'enykeev',
      meta: {
        scopes: ['sensor']
      }
    }, {
      id: 'ruletoken',
      user: 'enykeev',
      meta: {
        scopes: ['rule']
      }
    }, {
      id: 'executiontoken',
      user: 'enykeev',
      meta: {
        scopes: ['execution']
      }
    }, {
      id: 'sometoken',
      user: 'someguy',
      meta: {
        scopes: ['web']
      }
    }
  ])
}


exports.seed = async knex => {
  await knex('tokens').del()
  await knex('tokens').insert([
    {
      id: 'alltoken',
      user: 'enykeev',
      meta: {
        scopes: ['all']
      },
      created_by: 'initial seeding'
    }, {
      id: 'sensortoken',
      user: 'enykeev',
      meta: {
        scopes: ['sensor']
      },
      created_by: 'initial seeding'
    }, {
      id: 'sensorruletoken',
      user: 'enykeev',
      meta: {
        scopes: ['sensor', 'rule']
      },
      created_by: 'initial seeding'
    }, {
      id: 'ruletoken',
      user: 'enykeev',
      meta: {
        scopes: ['rule']
      },
      created_by: 'initial seeding'
    }, {
      id: 'ruleexecutiontoken',
      user: 'enykeev',
      meta: {
        scopes: ['rule', 'execution']
      },
      created_by: 'initial seeding'
    }, {
      id: 'executiontoken',
      user: 'enykeev',
      meta: {
        scopes: ['execution']
      },
      created_by: 'initial seeding'
    }, {
      id: 'sensorexecutiontoken',
      user: 'enykeev',
      meta: {
        scopes: ['sensor', 'execution']
      },
      created_by: 'initial seeding'
    }, {
      id: 'sometoken',
      user: 'someguy',
      meta: {
        scopes: ['web']
      },
      created_by: 'initial seeding'
    }
  ])
}

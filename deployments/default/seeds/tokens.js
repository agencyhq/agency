export const seed = async knex => {
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
        scopes: ['sensor', 'service']
      },
      created_by: 'initial seeding'
    }, {
      id: 'ruletoken',
      user: 'enykeev',
      meta: {
        scopes: ['rule', 'service']
      },
      created_by: 'initial seeding'
    }, {
      id: 'executiontoken',
      user: 'enykeev',
      meta: {
        scopes: ['execution', 'service']
      },
      created_by: 'initial seeding'
    }, {
      id: 'adapter_telegram',
      user: 'enykeev',
      meta: {
        scopes: ['sensor', 'execution']
      },
      created_by: 'initial seeding'
    }, {
      id: 'sometoken',
      user: 'someuser',
      meta: {
        scopes: ['all']
      },
      created_by: 'initial seeding'
    }
  ])
}

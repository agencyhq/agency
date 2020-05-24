
exports.up = (knex) => {
  return knex.schema
    .createTable('executions', t => {
      t.string('id').primary()
      t.string('triggered_by')
      t.string('action')
      t.jsonb('parameters')
      t.timestamps(false, true)
      t.enum('status', ['requested', 'claimed', 'running', 'completed'])
    })
    .createTable('results', t => {
      t.string('id').primary()
      t.jsonb('result')
      t.enum('status', ['succeeded', 'failed', 'timeout'])
    })
    .createTable('rules', t => {
      t.string('id').primary()
      t.text('code')
      t.timestamps(false, true)
    })
    .createTable('tokens', t => {
      t.string('id').primary()
      t.string('user')
      t.jsonb('meta')
    })
}

exports.down = (knex) => {
  return knex.schema
    .dropTable('executions')
    .dropTable('results')
    .dropTable('rules')
    .dropTable('tokens')
}

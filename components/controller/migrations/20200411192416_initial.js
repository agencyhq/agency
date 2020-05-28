
exports.up = (knex) => {
  return knex.schema
    .createTable('executions', t => {
      t.string('id').primary()
      t.string('triggered_by')
      t.string('matched_to')
      t.unique(['triggered_by', 'matched_to'])
      t.string('action')
      t.jsonb('parameters')
      t.timestamps(false, true)
      t.enum('status', ['requested', 'scheduled', 'claimed', 'running', 'completed'])
      t.string('user')
    })
    .createTable('results', t => {
      t.string('id').primary()
      t.jsonb('result')
      t.enum('status', ['succeeded', 'failed', 'timeout'])
      t.string('user')
    })
    .createTable('rules', t => {
      t.string('id').primary()
      t.text('code')
      t.timestamps(false, true)
      t.string('user')
    })
    .createTable('tokens', t => {
      t.string('id').primary()
      t.string('user').notNullable()
      t.jsonb('meta')
      t.timestamp('created_at').defaultTo(knex.fn.now())
      t.string('created_by').notNullable()
    })
}

exports.down = (knex) => {
  return knex.schema
    .dropTable('executions')
    .dropTable('results')
    .dropTable('rules')
    .dropTable('tokens')
}

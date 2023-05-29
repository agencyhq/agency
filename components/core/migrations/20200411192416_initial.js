exports.up = (knex) => {
  return knex.schema
    .createTable('executions', t => {
      t.string('id').primary()
      t.string('triggered_by').notNullable()
      t.string('matched_to').notNullable()
      t.string('hash')
      t.unique(['triggered_by', 'matched_to', 'hash'])
      t.string('action')
      t.jsonb('parameters')
      t.timestamps(false, true)
      t.enum('status', ['requested', 'scheduled', 'claimed', 'running', 'completed'])
      t.string('user').notNullable()
    })
    .raw('ALTER TABLE executions ADD CONSTRAINT valid_user CHECK ("user" != \'*\')')

    .createTable('results', t => {
      t.string('id').primary()
      t.jsonb('result')
      t.enum('status', ['succeeded', 'failed', 'timeout'])
      t.string('user').notNullable()
    })
    .raw('ALTER TABLE results ADD CONSTRAINT valid_user CHECK ("user" != \'*\')')

    .createTable('rules', t => {
      t.string('id').primary()
      t.text('code').notNullable()
      t.timestamps(false, true)
      t.string('user').notNullable()
    })
    .raw('ALTER TABLE rules ADD CONSTRAINT valid_user CHECK ("user" != \'*\')')

    .createTable('tokens', t => {
      t.string('id').primary()
      t.string('user').notNullable()
      t.jsonb('meta')
      t.timestamp('created_at').defaultTo(knex.fn.now())
      t.string('created_by').notNullable()
    })
    .raw('ALTER TABLE tokens ADD CONSTRAINT valid_user CHECK ("user" != \'*\')')
}

exports.down = (knex) => {
  return knex.schema
    .dropTable('executions')
    .dropTable('results')
    .dropTable('rules')
    .dropTable('tokens')
}

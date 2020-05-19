
exports.up = (knex) => {
  return knex.schema
    .createTable('executions', t => {
      t.string('id').primary()
      t.string('triggered_by')
      t.string('action')
      t.jsonb('parameters')
    })
    .createTable('results', t => {
      t.string('id').primary()
      t.jsonb('result')
    })
}

exports.down = (knex) => {
  return knex.schema
    .dropTable('executions')
    .dropTable('results')
}

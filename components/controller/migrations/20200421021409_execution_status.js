exports.up = (knex) => {
  return knex.schema.table('executions', t => {
    t.enum('status', ['requested', 'claimed', 'running', 'completed'])
  })
}

exports.down = (knex) => {
  return knex.schema.table('executions', t => {
    t.dropColumn('status')
  })
}

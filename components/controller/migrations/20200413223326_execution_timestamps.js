
exports.up = knex => {
  return knex.schema.table('executions', t => {
    t.timestamps(false, true)
  })
}

exports.down = knex => {
  return knex.schema.table('executions', t => {
    t.dropTimestamps()
  })
}

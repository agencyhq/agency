exports.up = (knex) => {
  return knex.schema.table('rules', t => {
    t.timestamps(false, true)
  })
}

exports.down = (knex) => {
  return knex.schema.table('rules', t => {
    t.dropTimestamps()
  })
}

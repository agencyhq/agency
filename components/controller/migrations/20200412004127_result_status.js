
exports.up = (knex) => {
  return knex.schema.table('results', t => {
    t.enum('status', ['succeeded', 'failed', 'timeout'])
  })
}

exports.down = (knex) => {
  return knex.schema.table('results', t => {
    t.dropColumn('status')
  })
}

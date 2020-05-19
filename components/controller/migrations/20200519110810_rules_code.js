exports.up = (knex) => {
  return knex.schema.table('rules', t => {
    t.text('code')
    t.dropColumn('if')
    t.dropColumn('then')
  })
}

exports.down = (knex) => {
  return knex.schema.table('rules', t => {
    t.dropColumn('code')
    t.text('if')
    t.text('then')
  })
}

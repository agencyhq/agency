
exports.up = knex => {
  return knex.schema
    .createTable('rules', t => {
      t.string('id').primary()
      t.text('if')
      t.text('then')
    })
}

exports.down = knex => {
  return knex.schema
    .dropTable('rules')
}

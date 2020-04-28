const models = require('../../models')

module.exports = async (req, res) => {
  const collection = await models.Executions
    .query(q => q.orderBy('created_at', 'DESC'))
    .fetchAll({
      withRelated: ['result']
    })
    .map(execution => {
      return {
        ...execution.serialize(),
        status: execution.relations.result.get('status'),
        result: execution.relations.result.get('result')
      }
    })

  res.json(collection)
}

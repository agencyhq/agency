const React = require('react')
const { useSelector, shallowEqual } = require('react-redux')

const Execution = require('./execution')

function Executions () {
  const executions = useSelector(state => {
    return state.executions
  }, shallowEqual)

  const executionsToShow = executions.slice(0, 5)

  return <div className="executions">
    <h5>Assignments</h5>
    {
      executionsToShow.map(e => {
        return <Execution key={e.id} opts={e} />
      })
    }
  </div>
}

module.exports = Executions

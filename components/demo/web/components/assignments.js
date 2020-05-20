const React = require('react')
const { useSelector, shallowEqual } = require('react-redux')

const Assignment = require('./assignment')

function Assignments () {
  const assignments = useSelector(state => {
    return state.assignments
  }, shallowEqual)

  const assignmentsToShow = assignments.slice(0, 5)

  return <div className="executions">
    <h5 className="header" >Assignments</h5>
    {
      assignmentsToShow.map(e => {
        return <Assignment key={e.id} opts={e} />
      })
    }
  </div>
}

module.exports = Assignments

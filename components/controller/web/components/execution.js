const React = require('react')
const PropTypes = require('prop-types')

function Execution ({ opts }) {
  const {
    action,
    parameters
  } = opts

  return <div className='execution paper'>
    <div className='execution_name'>{ action }</div>
    <div className='execution_parameters selectable'>
      { JSON.stringify(parameters, null, 2) }
    </div>
  </div>
}

Execution.propTypes = {
  opts: PropTypes.object.isRequired
}

module.exports = Execution

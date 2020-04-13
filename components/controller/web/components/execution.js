const React = require('react')
const PropTypes = require('prop-types')
const ReactTimeAgo = require('react-time-ago').default
const JavascriptTimeAgo = require('javascript-time-ago').default

JavascriptTimeAgo.locale(require('javascript-time-ago/locale/en'))

function Execution ({ opts }) {
  const {
    created_at: createdAt,
    action,
    parameters
  } = opts

  return <div className='execution paper'>
    <div className='execution_name'>{ action }</div>
    <div className='execution_created'><ReactTimeAgo date={ new Date(createdAt) } /></div>
    <div className='execution_parameters selectable'>
      { JSON.stringify(parameters, null, 2) }
    </div>
  </div>
}

Execution.propTypes = {
  opts: PropTypes.object.isRequired
}

module.exports = Execution

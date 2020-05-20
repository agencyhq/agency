const React = require('react')
const PropTypes = require('prop-types')
const ReactTimeAgo = require('react-time-ago').default
const JavascriptTimeAgo = require('javascript-time-ago').default

JavascriptTimeAgo.locale(require('javascript-time-ago/locale/en'))

function Assignment ({ opts }) {
  const {
    created_at: createdAt,
    action,
    parameters,
    result
  } = opts

  return <div className='assignment'>
    <div className='assignment_name'>{ action }</div>
    <div className='assignment_created'><ReactTimeAgo date={ new Date(createdAt) } /></div>
    <div className='assignment_parameters selectable'>
      { JSON.stringify(parameters, null, 2) }
    </div>
    <div className='assignment_parameters selectable'>
      { JSON.stringify(result, null, 2) }
    </div>
  </div>
}

Assignment.propTypes = {
  opts: PropTypes.object.isRequired
}

module.exports = Assignment

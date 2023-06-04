import React from 'react'
import PropTypes from 'prop-types'
import ReactTimeAgo from 'react-time-ago'
import JavascriptTimeAgo from 'javascript-time-ago'
import JavascriptTimeAgoLocale from 'javascript-time-ago/locale/en'

JavascriptTimeAgo.locale(JavascriptTimeAgoLocale)

export default function Assignment ({ opts }) {
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

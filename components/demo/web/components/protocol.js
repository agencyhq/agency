import React from 'react'
import PropTypes from 'prop-types'

export default function Protocol ({ model }) {
  const {
    code
  } = model

  return <pre className="snippet">
    { code }
  </pre>
}

Protocol.propTypes = {
  model: PropTypes.object.isRequired
}

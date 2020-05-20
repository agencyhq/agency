const React = require('react')
const PropTypes = require('prop-types')

function Protocol ({ model }) {
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

module.exports = Protocol

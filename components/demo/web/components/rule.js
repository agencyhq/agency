const React = require('react')
const PropTypes = require('prop-types')

function Rule ({ model }) {
  const {
    code
  } = model

  return <pre className="snippet">
    { code }
  </pre>
}

Rule.propTypes = {
  model: PropTypes.object.isRequired
}

module.exports = Rule

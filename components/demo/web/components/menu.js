const React = require('react')
const PropTypes = require('prop-types')

const { useDispatch, useSelector } = require('react-redux')

const { FontAwesomeIcon } = require('@fortawesome/react-fontawesome')
const {
  faBalanceScale,
  faShippingFast,
  faGraduationCap,
  faCogs
} = require('@fortawesome/free-solid-svg-icons')

function MenuItem ({ name, icon }) {
  const dispatch = useDispatch()
  const tab = useSelector(({ tabs }) => tabs[name])

  return <div
    className={`item${tab ? ' active' : ''}`}
    onClick={() => dispatch({ type: 'TOGGLE_TAB', name })}
  >
    <FontAwesomeIcon icon={icon} />
  </div>
}

MenuItem.propTypes = {
  name: PropTypes.string.isRequired,
  icon: PropTypes.object.isRequired
}

function MenuSpacer () {
  return <div className="spacer" />
}

function Menu () {
  return <div className="menu">
    <div className="logo" />

    <MenuItem name="assignments" icon={faShippingFast} />
    <MenuItem name="protocols" icon={faBalanceScale} />
    <MenuSpacer />
    <MenuItem name="intro" icon={faGraduationCap} />
    <MenuItem name="settings" icon={faCogs} />
  </div>
}

module.exports = Menu

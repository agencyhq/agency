const React = require('react')

const { useDispatch, useSelector, shallowEqual } = require('react-redux')

const { FontAwesomeIcon } = require('@fortawesome/react-fontawesome')
const {
  faBalanceScale,
  faShippingFast,
  faGraduationCap,
  faCogs
} = require('@fortawesome/free-solid-svg-icons')

function Menu () {
  const dispatch = useDispatch()

  const tabs = useSelector(({ tabs }) => tabs, shallowEqual)

  return <div className="menu">
    <div className="logo" />

    <div
      className={`item${tabs.assignments ? ' active' : ''}`}
      onClick={() => dispatch({ type: 'TOGGLE_TAB', name: 'assignments' })}
    >
      <FontAwesomeIcon icon={faShippingFast} />
    </div>
    <div className="item">
      <FontAwesomeIcon icon={faBalanceScale} />
    </div>
    <div className="spacer" />
    <div
      className={`item${tabs.intro ? ' active' : ''}`}
      onClick={() => dispatch({ type: 'TOGGLE_TAB', name: 'intro' })}
    >
      <FontAwesomeIcon icon={faGraduationCap} />
    </div>
    <div className="item">
      <FontAwesomeIcon icon={faCogs} />
    </div>
  </div>
}

module.exports = Menu

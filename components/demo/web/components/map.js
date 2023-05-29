const React = require('react')
const PropTypes = require('prop-types')

const map = require('@agencyhq/world').default
const mapSVG = require('@agencyhq/world/world.svg')

function Map ({ threats }) {
  return <svg preserveAspectRatio="xMidYMid meet" viewBox={map.viewBox} xmlns="http://www.w3.org/2000/svg" className="map">
    <use href={`${mapSVG}#world`} fill="gray" />
    {
      map.locations
        .filter(loc => threats.has(loc.id))
        .map(loc => {
          return <path key={loc.id} data-ident={loc.id} d={loc.path} />
        })
    }
  </svg>
}

Map.propTypes = {
  threats: PropTypes.instanceOf(Set)
}

module.exports = Map

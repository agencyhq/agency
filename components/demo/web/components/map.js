import React from 'react'
import PropTypes from 'prop-types'

import map from '@agencyhq/world'
import mapSVG from '@agencyhq/world/world.svg'

export default function Map ({ threats }) {
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

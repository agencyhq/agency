import React from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import Protocol from './protocol.js'

const PAGE_SIZE = 5

export default function Protocols () {
  const protocols = useSelector(state => {
    return state.protocols
  }, shallowEqual)

  const [itemsToShow, setItemsToShow] = React.useState(PAGE_SIZE)

  const protocolsToShow = protocols.slice(0, itemsToShow)

  return <div className="protocols">
    <h5 className="header" >Protocols</h5>
    {
      protocolsToShow.map(e => {
        return <Protocol key={e.id} model={e} />
      })
    }
    <button onClick={() => setItemsToShow(itemsToShow + PAGE_SIZE)}>
      show more
    </button>
  </div>
}

const React = require('react')
const { useSelector, shallowEqual } = require('react-redux')

const Protocol = require('./protocol')

const PAGE_SIZE = 5

function Protocols () {
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

module.exports = Protocols

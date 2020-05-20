const React = require('react')
const ReactDOM = require('react-dom')

const RPCClient = require('@agencyhq/jsonrpc-ws/lib/client')
const { useDispatch, useSelector, Provider } = require('react-redux')
const WebSocket = require('x-platform-ws')

const store = require('./store')
const Intro = require('./components/intro')
const Assignments = require('./components/assignments')
const Map = require('./components/map')

require('./css/index.css')

function Menu () {
  const dispatch = useDispatch()

  return <div className="menu">
    <div className="logo" />

    <div className="item" onClick={() => dispatch({ type: 'TOGGLE_ASSIGNMENTS' })}>assignments</div>
    <div className="item">protocols</div>
    <div className="spacer" />
    <div className="item" onClick={() => dispatch({ type: 'TOGGLE_INTRO' })}>intro</div>
    <div className="item">settings</div>
  </div>
}

const ws = window.ws = new RPCClient(`ws://${location.hostname}:1234/api`, { WebSocket })

async function fetchExecutions () {
  store.dispatch({ type: 'EXECUTION_FETCH', status: 'pending' })
  try {
    const data = await ws.call('execution.list', { pageSize: 15 })
    store.dispatch({ type: 'EXECUTION_FETCH', status: 'success', data })
  } catch (error) {
    console.log(error)
    store.dispatch({ type: 'EXECUTION_FETCH', status: 'error', error })
  }
}

async function fetchRules () {
  store.dispatch({ type: 'RULE_FETCH', status: 'pending' })
  try {
    const data = await ws.call('rule.list', { pageSize: 15 })
    store.dispatch({ type: 'RULE_FETCH', status: 'success', data })
  } catch (error) {
    console.log(error)
    store.dispatch({ type: 'RULE_FETCH', status: 'error', error })
  }
}

function App () {
  React.useEffect(() => {
    (async () => {
      if (!ws.isConnected()) {
        await ws.connect()
        await ws.auth({ token: 'alltoken' })
      }

      fetchExecutions()
      fetchRules()
    })()
  }, [])

  const showIntro = useSelector(state => {
    return state.showIntro
  })

  const showAssignments = useSelector(state => {
    return state.showAssignments
  })

  return <div className="app">
    <Map threats={new Set(['ru', 'gb'])} />
    <div className="page">
      <Menu />
      { showIntro && <Intro /> }
      { showAssignments && <Assignments /> }
    </div>
  </div>
}

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
)

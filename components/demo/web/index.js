const React = require('react')
const ReactDOM = require('react-dom')

const { useSelector, Provider } = require('react-redux')

const ws = require('./lib/ws')
const store = require('./store')
const Intro = require('./components/intro')
const Assignments = require('./components/assignments')
const Map = require('./components/map')
const Menu = require('./components/menu')
const Protocols = require('./components/protocols')

require('./css/index.css')

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

async function subscribeRules () {
  await ws.subscribe('rule', data => {
    store.dispatch({ type: 'RULE_UPDATED', data })
  })
}

async function subscribeExecutions () {
  await ws.subscribe('execution', data => {
    store.dispatch({ type: 'EXECUTION_UPDATED', data })
  })
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

      subscribeRules()
      subscribeExecutions()
    })()
  }, [])

  const tabs = useSelector(state => {
    return state.tabs
  })

  return <div className="app">
    <Map threats={new Set(['ru', 'gb'])} />
    <div className="page">
      <Menu />
      { tabs.intro && <Intro /> }
      { tabs.protocols && <Protocols /> }
      { tabs.assignments && <Assignments /> }
    </div>
  </div>
}

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
)

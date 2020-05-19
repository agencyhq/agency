const React = require('react')
const ReactDOM = require('react-dom')

const RPCClient = require('@agencyhq/jsonrpc-ws/lib/client')
const WebSocket = require('x-platform-ws')
const { Provider } = require('react-redux')

const store = require('./store')
const Intro = require('./components/intro')
const Executions = require('./components/executions')

require('./css/index.css')

const ws = window.ws = new RPCClient(`ws://${location.hostname}:1234/api`, { WebSocket })

async function connect () {
  await ws.connect()
  await ws.auth({ token: 'alltoken' })
}

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

function App () {
  React.useEffect(() => {
    connect()
      .then(() => fetchExecutions())
  }, [])

  return <div className="page">
    <Intro />
    <Executions />
  </div>
}

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
)

const React = require('react')
const ReactDOM = require('react-dom')

const { Provider } = require('react-redux')
const store = require('./store')

const Intro = require('./components/intro')
const Executions = require('./components/executions')

require('./css/index.css')

function connectWebsocket () {
  const ws = new WebSocket(`ws://${location.host}/ws`)

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)

    if (data.key === 'execution') {
      store.dispatch({
        type: 'EXECUTION_ADD',
        execution: data.message
      })
    }
  }
}

async function fetchExecutions () {
  store.dispatch({ type: 'EXECUTION_FETCH', status: 'pending' })
  try {
    const res = await fetch('/api/executions')
    const data = await res.json()
    store.dispatch({ type: 'EXECUTION_FETCH', status: 'success', data })
  } catch (error) {
    store.dispatch({ type: 'EXECUTION_FETCH', status: 'error', error })
  }
}

function App () {
  React.useEffect(() => {
    fetchExecutions()
    connectWebsocket()
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

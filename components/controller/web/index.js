const React = require('react')
const ReactDOM = require('react-dom')

const { Provider, useSelector, shallowEqual } = require('react-redux')
const store = require('./store')

const Execution = require('./components/execution')

require('./css/index.css')

function connectWebsocket () {
  const ws = new WebSocket(`ws://${location.host}/ws`)

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)

    if (data.key === 'execution') {
      store.dispatch({ type: 'EXECUTION_INC' })
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

  const executions = useSelector(state => {
    return state.executions
  }, shallowEqual)

  const newExecutions = useSelector(state => {
    return state.newExecutions
  }, shallowEqual)

  return <div className="executions">
    <h4>
      {
        !newExecutions
          ? `there's no new executions`
          : newExecutions === 1
            ? `there's one new execution`
            : `there's ${newExecutions} new executions`
      }
    </h4>
    {
      executions.map(e => {
        return <Execution key={e.id} opts={e} />
      })
    }
  </div>
}

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
)

const React = require('react')
const ReactDOM = require('react-dom')

const { Provider, useSelector, shallowEqual } = require('react-redux')
const store = require('./store')

const Execution = require('./components/execution')

require('./css/index.css')

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
  }, [])

  const executions = useSelector(state => {
    return state.executions
  }, shallowEqual)

  return <div className="executions">
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

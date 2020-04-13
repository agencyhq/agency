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

const exampleEvent = {
  type: 'web',
  url: 'https://httpbin.org/post',
  payload: {
    a: 'b'
  }
}

function emitEvent () {
  return fetch('/sensor/http', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(exampleEvent)
  })
}

function App () {
  React.useEffect(() => {
    fetchExecutions()
    connectWebsocket()
  }, [])

  const executions = useSelector(state => {
    return state.executions
  }, shallowEqual)

  const executionsToShow = executions.slice(0, 5)

  const snippetCurl = `curl -X POST ${location.origin}/sensor/http -H Content-Type:application/json -d '${JSON.stringify(exampleEvent)}'`

  const snippetIf = "trigger => trigger.type === 'http' && trigger.event.body.type === 'web'"

  const snippetThen = `trigger => ({
    id: crypto.randomBytes(16).toString('hex'),
    triggered_by: trigger.id,
    action: 'http',
    parameters: {
      url: trigger.event.body.url,
      payload: trigger.event.body.payload
    }
  })`

  return <div className="page">
    <div className="intro">
      <h3>
        IFTTT because why not
      </h3>
      <p>
        This is the system that allows you to automate the response to incoming events.
      </p>
      <div className="trigger">
        <input type="button" value="emit an event" onClick={() => emitEvent()}/>
      </div>
      <p>
        For the purpose of demonstration, clicking on the button will send a POST request to our http sensor which converts it to a trigger. You can also executed it via <b>curl</b> as it would also allow you to change request body.
      </p>
      <pre className="snippet">
        { snippetCurl }
      </pre>
      <p>
        Said trigger will be evaluated against rules. To pass the rule, the trigger would need to pass its <b>if</b> criterias.
      </p>
      <pre className="snippet">
        { snippetIf }
      </pre>
      <p>
        Passing on a rule results in execution. The parameters for the execution are going to be created from trigger parameters (and potentially some other sources) during rule evaluation.
      </p>
      <pre className="snippet">
        { snippetThen }
      </pre>
      <p>
        List on the right shows executions happened in the system. The new execution will appear on the list and will allow you to track its progress and see the result. The work related in progressing the execution is being done by separate action runner process.
      </p>
    </div>
    <div className="executions">
      {
        executionsToShow.map(e => {
          return <Execution key={e.id} opts={e} />
        })
      }
    </div>
  </div>
}

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
)

const React = require('react')

const exampleEvent = {
  type: 'web',
  url: 'https://httpbin.org/post',
  payload: {
    a: 'b'
  }
}

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

function emitEvent () {
  return fetch('/sensor/http', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(exampleEvent)
  })
}

function Intro () {
  return <div className="intro">
    <h3>
      IFTTT because why not
    </h3>
    <p>
      This is the system that allows you to automate the response to incoming events.
    </p>
    <div className="trigger">
      <button className="green-button" onClick={() => emitEvent()}>emit an event</button>
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
}

module.exports = Intro

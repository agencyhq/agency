import React from 'react'
import PropTypes from 'prop-types'
import { UnControlled as CodeMirror } from 'react-codemirror2'
import { useDispatch, useSelector, shallowEqual } from 'react-redux'

import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/javascript/javascript'

import ws from '../lib/ws.js'

function Button ({ children, className = '', onClick, ...rest }) {
  const initialClasses = className.split(' ')
  const [classNames, setClassNames] = React.useState(initialClasses)

  async function onClickHandler () {
    if (!onClick) {
      return
    }

    try {
      await onClick()
      setClassNames([...new Set(classNames).add('succeeded')])
    } catch (e) {
      setClassNames([...new Set(classNames).add('error')])
    }
  }

  function tansitionEndHandler () {
    setClassNames(initialClasses)
  }

  return <button
    className={['button', ...classNames].join(' ')}
    onClick={onClickHandler}
    onTransitionEnd={tansitionEndHandler}
    { ...rest }
  >{ children }</button>
}

Button.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  onClick: PropTypes.func
}

function selectText (el) {
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(el)
  selection.removeAllRanges()
  selection.addRange(range)
}

function CodeSnippet ({ children }) {
  const ref = React.useRef(null)
  return <pre ref={ref} className="snippet" onDoubleClick={() => selectText(ref.current)}>
    { children }
  </pre>
}

CodeSnippet.propTypes = {
  children: PropTypes.node
}

const defaultEvent = {
  type: 'web',
  url: 'https://httpbin.org/post',
  payload: {
    a: 'b'
  }
}

async function saveProtocol (code) {
  await ws.call('rule.update', { id: 'http-web', code })
}

async function emitEvent (body) {
  await fetch('/sensor/http', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  })
}

export default function Intro () {
  const protocol = useSelector(state => {
    return state.protocols.find(proto => proto.id === 'http-web')
  }, shallowEqual)

  const dispatch = useDispatch()

  const [exampleEvent, setExampleEvent] = React.useState(JSON.stringify(defaultEvent, null, 2))
  const [protocolCandidate, setProtocolCandidate] = React.useState()

  const protocolChanged = protocol && protocolCandidate && protocol.code !== protocolCandidate

  return <div className="intro">
    <div className="close" onClick={() => dispatch({ type: 'TOGGLE_TAB', name: 'intro' })}/>
    <h5>
      Welcome to the Agency, Director.
    </h5>
    <p>
      To increase the effectiveness and transperancy of operations within the Agency, our IT contractors came up with an overreaching intellegence framework for tracking and terminating threats (IFTTT). The framework connects our network of moles (sensors), analysts (rule engines) and field operatives (action runners) across the globe in a secure and resilient manner. It is my pleasure to introduce you to our HQ operation center.
    </p>
    <p>
      Given the delicate nature of the work we are doing here, our specialists are rigorously trained to follow Agency protocols to the letter. Failure results in immediate termination.
    </p>
    <p>
      Your main responsibility as a Director is to came up with the set of protocols to protect the world and the Agency from all kinds of threats, foreign and domestic. In compliance with government recommendations, our IT contractors decided not to invent another DSL and instead use popular and proven scripting language, ECMA-262, also known as JavaScript.
    </p>
    {
      protocol &&
        <CodeMirror
          value={protocol.code}
          options={{
            lineNumbers: true
          }}
          onChange={editor => setProtocolCandidate(editor.getValue())}
        />
    }
    <div className="trigger" >
      {
        <Button
          onClick={async () => saveProtocol(protocolCandidate)}
          disabled={!protocolChanged ? 'disabled' : ''}
        >
          update protocol
        </Button>
      }
    </div>
    <p>
      For the purpose of demonstration, clicking on the button will send a POST request to our mole who in turn will promptly report this incident to HQ. Another way to contact the mole is via <b>curl</b>.
    </p>
    <CodeMirror
      value={exampleEvent}
      options={{
        lineNumbers: true
      }}
      onBlur={editor => setExampleEvent(editor.getValue())}
    />
    <div className="trigger">
      <Button className="green-button" onClick={async () => {
        await emitEvent(exampleEvent)
        dispatch({ type: 'TOGGLE_TAB', name: 'assignments', state: true })
      }}>emit an event</Button>
    </div>
    <CodeSnippet>
      {`curl -X POST ${location.origin}/sensor/http -d '${exampleEvent}' -H Content-Type:application/json`}
    </CodeSnippet>
    <p>
      Every reported incident is assigned to one of our analysts for evaluation. Whether or not the incident deserves the response is decided by the <b>if</b> portion of the protocol. If this condition ends up truthful, analyst would have to evaluate <b>then</b> portion of the protocol to came up with an appropriate action and a set of parameters and inform HQ of his recommendations in form of an assignment (execution).
    </p>
    <p>
      Agency&apos;s field operatives are in constant contact with HQ and are always eager to take on a new task. HQ broadcasts the assignment to all eligible operatives and allows them to pick the assignment better suited for their specific skillset. First operatives that responds to the assignment gets a green light. All following responses are automatically denied.
    </p>
    <p>
      The assignment panel shows a list of latest assignments along with their progress and results allowing you to have a surface level understanding of the latest threats and responses. For birds-eye view of the Agency performance and operation parameters, we recommend taking a look at our Grafana dashboard.
    </p>
    <p>
      It is important to add that in the framework, the HQ holds all the power in terms of controlling the flow of information. It is to HQ&apos;s sole discretion whether or not to pass the intel from one of the moles to analysts and if so, whether to send it to one or multiple analysts for cross-check. HQ also controls what protocols are given to what analysts and what assignments are given to what operative. Operative may refuse to accept an assignment due to lack of capabilities or high load, but it is up to HQ to reassign them to some other operative or put it in a backlog until suitable operative contacts it.
    </p>
    <p>
      Keeping as much control in hands of HQ makes it much easier to implement new capabilities, provides a way for backward compatibility, fine grained access control, quality of service and scaling. It also allows agencies to onboard any suitable local specialist speaking different language as long as it can follow Agency communication guidelines (JSON-RPC via WebSocket).
    </p>
    <p>
      We wish you luck in your new assignment. Remember, the world depends on you.
    </p>
    <p className="signature" >
      [ digital signature confirmed ]
    </p>
  </div>
}

const { createStore } = require('redux')

function rootReducer (state, action) {
  state = state || {
    executions: [],
    rules: [],
    showIntro: true,
    showAssignments: false
  }

  const {
    executions,
    showIntro,
    showAssignments
  } = state

  switch (action.type) {
    case 'EXECUTION_FETCH':
      switch (action.status) {
        case 'success':
          return {
            ...state,
            executions: action.data
          }
        case 'error':
          return {
            ...state,
            error: action.error
          }
        default:
          return state
      }
    case 'RULE_FETCH':
      switch (action.status) {
        case 'success':
          return {
            ...state,
            rules: action.data
          }
        case 'error':
          return {
            ...state,
            error: action.error
          }
        default:
          return state
      }
    case 'EXECUTION_ADD':
      return {
        ...state,
        executions: [action.execution, ...executions]
      }

    case 'TOGGLE_INTRO':
      return {
        ...state,
        showIntro: !showIntro
      }

    case 'TOGGLE_ASSIGNMENTS':
      return {
        ...state,
        showAssignments: !showAssignments
      }
    default:
      return state
  }
}

module.exports = createStore(
  rootReducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)

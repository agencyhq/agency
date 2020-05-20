const { createStore } = require('redux')

function rootReducer (state, action) {
  state = state || {
    assignments: [],
    protocols: [],
    showIntro: true,
    showAssignments: false
  }

  const {
    assignments,
    showIntro,
    showAssignments
  } = state

  switch (action.type) {
    case 'EXECUTION_FETCH':
      switch (action.status) {
        case 'success':
          return {
            ...state,
            assignments: action.data
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
            protocols: action.data
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
        assignments: [action.execution, ...assignments]
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

const { createStore } = require('redux')

function rootReducer (state, action) {
  state = state || {
    loading: false,
    executions: [],
    newExecutions: 0
  }

  switch (action.type) {
    case 'EXECUTION_FETCH':
      switch (action.status) {
        case 'pending':
          return {
            ...state,
            loading: true
          }
        case 'success':
          return {
            ...state,
            loading: false,
            executions: action.data,
            newExecutions: 0
          }
        case 'error':
          return {
            ...state,
            loading: false,
            error: action.error
          }
        default:
          return state
      }
    case 'EXECUTION_INC':
      return {
        ...state,
        newExecutions: state.newExecutions + 1
      }
    default:
      return state
  }
}

module.exports = createStore(
  rootReducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)

const { createStore } = require('redux')

function rootReducer (state, action) {
  state = state || {
    executions: []
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
            executions: action.data
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
    default:
      return state
  }
}

module.exports = createStore(
  rootReducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)

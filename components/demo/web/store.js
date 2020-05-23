const { createStore } = require('redux')

function rootReducer (state, action) {
  state = state || {
    assignments: [],
    protocols: [],
    showIntro: true,
    showAssignments: false
  }

  let {
    assignments,
    protocols,
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
    case 'EXECUTION_UPDATED': {
      const index = assignments.findIndex(a => a.id === action.data.id)

      if (index !== -1) {
        assignments[index] = action.data
      } else {
        assignments = [action.data, ...assignments]
      }

      return {
        ...state,
        assignments
      }
    }
    case 'RULE_UPDATED':
      return {
        ...state,
        protocols: protocols
          .map(p => {
            if (p.id === action.data.id) {
              return action.data
            } else {
              return p
            }
          })
      }
    case 'TOGGLE_INTRO':
      if (action.state !== undefined) {
        showIntro = action.state
      } else {
        showIntro = !showIntro
      }

      return {
        ...state,
        showIntro
      }

    case 'TOGGLE_ASSIGNMENTS':
      if (action.state !== undefined) {
        showAssignments = action.state
      } else {
        showAssignments = !showAssignments
      }

      return {
        ...state,
        showAssignments
      }
    default:
      return state
  }
}

module.exports = createStore(
  rootReducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)

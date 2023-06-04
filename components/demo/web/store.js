import { createStore } from 'redux'

function rootReducer (state, action) {
  state = state || {
    tabs: {
      intro: true
    },
    assignments: [],
    protocols: []
  }

  let {
    assignments,
    protocols,
    tabs
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
    case 'TOGGLE_TAB': {
      const { name, state: toState } = action

      if (toState !== undefined) {
        tabs[name] = toState
      } else {
        tabs[name] = !tabs[name]
      }

      return {
        ...state,
        tabs: {
          ...tabs
        }
      }
    }

    default:
      return state
  }
}

export default createStore(
  rootReducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)

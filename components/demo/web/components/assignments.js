import React from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import Assignment from './assignment.js'

const PAGE_SIZE = 5

export default function Assignments () {
  const assignments = useSelector(state => {
    return state.assignments
  }, shallowEqual)

  const [itemsToShow, setItemsToShow] = React.useState(PAGE_SIZE)

  const assignmentsToShow = assignments.slice(0, itemsToShow)

  return <div className="assignments">
    <h5 className="header" >Assignments</h5>
    {
      assignmentsToShow.map(e => {
        return <Assignment key={e.id} opts={e} />
      })
    }
    <button onClick={() => setItemsToShow(itemsToShow + PAGE_SIZE)}>
      show more
    </button>
  </div>
}

module.exports = {
  if: trigger => trigger.type === 'http' && trigger.event.body.type === 'error',
  then: trigger => {
    throw new Error(trigger.event.body.message)
  }
}

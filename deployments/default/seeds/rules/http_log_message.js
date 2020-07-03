module.exports = {
  if: trigger => trigger.type === 'http' && trigger.event.body.type === 'log',
  then: trigger => {
    console.log(trigger)
  }
}

module.exports = {
  if: trigger =>
    trigger.type === 'http' &&
    trigger.event.body.type === 'web',
  then: trigger => ({
    action: 'http',
    parameters: {
      url: trigger.event.body.url,
      payload: trigger.event.body.payload
    }
  })
}

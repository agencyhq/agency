export default {
  if: trigger => trigger.type === 'http' && trigger.event.body.type === 'e2e',
  then: trigger => ({
    action: 'http',
    parameters: {
      url: trigger.event.body.url,
      payload: trigger.event.body.payload
    }
  })
}

export default {
  if: trigger => trigger.type === 'http' && trigger.event.body.type === 'e2e-multiple',
  then: trigger => ([{
    action: 'http',
    parameters: {
      url: trigger.event.body.url,
      payload: {
        ...trigger.event.body.payload,
        hash: 1
      }
    }
  }, {
    action: 'http',
    parameters: {
      url: trigger.event.body.url,
      payload: {
        ...trigger.event.body.payload,
        hash: 2
      }
    }
  }])
}

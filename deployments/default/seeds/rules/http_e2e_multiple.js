export function condition (trigger) {
  return trigger.type === 'http' && trigger.event.body.type === 'e2e-multiple'
}

export function then (trigger) {
  return [{
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
  }]
}

export default {
  if: trigger => trigger.type === 'http' && trigger.event.body.type === 'action',
  then: trigger => ({
    action: trigger.event.body.action,
    parameters: trigger.event.body.parameters
  })
}

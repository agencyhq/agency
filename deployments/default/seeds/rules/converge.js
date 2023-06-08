const sensor = 'sensor1'
const criticalTemp = 10

function IF (trigger) {
  return trigger.type === 'converge_sensor' &&
    trigger.event.sensors[sensor].last.value_avg >= criticalTemp &&
    trigger.event.sensors[sensor].previous.value_avg < criticalTemp
}

function THEN (trigger) {
  return {
    action: 'http',
    parameters: {
      url: 'https://httpbin.org/post',
      payload: {
        message: `sensor ${sensor} reached critical temperature of ${criticalTemp}`
      }
    }
  }
}

export default {
  if: IF,
  then: THEN
}

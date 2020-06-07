import http from 'k6/http'
import { sleep } from 'k6'

export const options = {
  stages: [
    { duration: '10s', target: 1 }
  ]
}

export default () => {
  http.post('http://sensor:3001/', JSON.stringify({
    type: 'e2e',
    url: 'http://sink'
  }), {
    headers: {
      'Content-type': 'application/json'
    }
  })
  sleep(1)
}

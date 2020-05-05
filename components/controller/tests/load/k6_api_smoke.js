import http from 'k6/http'
import { sleep } from 'k6'

export const options = {
  stages: [
    { duration: '10s', target: 1 }
  ]
}

export default () => {
  http.get('http://api:3000/')
  sleep(1)
}

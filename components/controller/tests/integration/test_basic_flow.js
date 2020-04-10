const axios = require('axios').default
const expect = require('chai').expect

describe('Server', () => {
  const client = axios.create({
    baseURL: 'http://localhost:3000'
  })

  describe('Root', () => {
    it('should return hello world string', async () => {
      const resp = await client.get('/')
      expect(resp.data).to.equal('Hello World')
    })
  })
})

import axios from 'axios'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'

const { expect } = chai
chai.use(chaiAsPromised)
chai.use(sinonChai)

describe('Sensor', () => {
  const client = axios.create({
    baseURL: 'http://localhost:3001'
  })

  describe('#/http', () => {
    it('should return ok on POST', async () => {
      const resp = await client.post('/http', { a: 'b' })
      expect(resp.data).to.equal('OK')
    })

    it.skip('should notify api of new trigger', () => {
      throw new Error('not implemented')
    })
  })
})

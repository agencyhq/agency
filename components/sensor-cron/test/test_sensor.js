const chai = require('chai')

const { expect } = chai
chai.use(require('chai-as-promised'))
chai.use(require('sinon-chai'))

describe('Cron Sensor', () => {
  describe('#/http', () => {
    it.skip('should notify api of new trigger', () => {
      expect(1).to.be.equal(1)
    })
  })
})

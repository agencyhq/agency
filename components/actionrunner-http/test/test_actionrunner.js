const chai = require('chai')

const { expect } = chai
chai.use(require('chai-as-promised'))
chai.use(require('sinon-chai'))

describe('Actionrunner', () => {
  it.skip('should listen for new executions', () => {
    expect(1).to.be.a('number')
  })
})

const chai = require('chai')

const { expect } = chai
chai.use(require('chai-as-promised'))
chai.use(require('sinon-chai'))

describe('Ruleengine', () => {
  it.skip('should pull a list of rules', () => {
    expect(1).to.be.a('number')
  })
})

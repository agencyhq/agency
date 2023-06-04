import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'

const { expect } = chai
chai.use(chaiAsPromised)
chai.use(sinonChai)

describe('Ruleengine', () => {
  it.skip('should pull a list of rules', () => {
    expect(1).to.be.a('number')
  })
})

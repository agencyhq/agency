const fs = require('fs')
const path = require('path')

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinon = require('sinon')
const yaml = require('js-yaml')

const routerFactory = require('../../src/rest/router')

const { expect } = chai
chai.use(chaiAsPromised)
chai.use(require('sinon-chai'))

const filepath = '../../src/openapi.yaml'

function loadSpec (filepath) {
  const content = fs.readFileSync(path.join(__dirname, filepath), 'utf8')
  const spec = yaml.safeLoad(content)

  return spec
}

function getScopes (spec) {
  const scopes = new Set(['all', 'non-existent'])

  for (const path in spec.paths) {
    for (const method in spec.paths[path]) {
      const {
        'x-security-scopes': authorizedScopes
      } = spec.paths[path][method]

      for (const scope of authorizedScopes) {
        scopes.add(scope)
      }
    }
  }

  scopes.delete('any')

  return scopes
}

describe('OpenAPI Router', () => {
  const handlers = {}
  const router = routerFactory(
    path.relative('../../src/rest', filepath),
    opId => {
      handlers[opId] = sinon.spy()
      return handlers[opId]
    }
  )

  const spec = loadSpec(filepath)

  for (const path in spec.paths) {
    for (const method in spec.paths[path]) {
      describe(`${method} ${path}`, () => {
        const {
          operationId: opId,
          'x-security-scopes': scopes
        } = spec.paths[path][method]

        const authorizedScopes = new Set([...scopes, 'all'])

        const allScopes = getScopes(spec)

        it('should be registered', () => {
          const hasValidRoute = router.stack.some(l => l.match(path) && l.route.methods[method])

          expect(hasValidRoute).to.be.true
        })

        for (const scope of allScopes) {
          if (authorizedScopes.has(scope) || authorizedScopes.has('any')) {
            it(`should handle the request for scope ${scope}`, () => {
              const out = sinon.fake()
              const req = {
                method,
                url: path,
                authInfo: {
                  scopes: [scope]
                }
              }
              const res = {
                end: sinon.fake()
              }
              router.handle(req, res, out)

              expect(out).to.not.be.calledOnce
              expect(res.end).to.not.be.called
              expect(handlers[opId]).to.be.calledOnce
              for (const handle in handlers) {
                if (handle !== opId) {
                  expect(handlers[handle]).to.not.be.called
                }
              }
            })
          } else {
            it(`should deny the request for scope ${scope}`, () => {
              const out = sinon.fake()
              const req = {
                method,
                url: path,
                authInfo: {
                  scopes: [scope]
                }
              }
              const res = {
                end: sinon.fake()
              }
              router.handle(req, res, out)

              expect(out).to.not.be.called
              expect(res.end).to.be.calledOnceWith('Forbidden')
              for (const handle in handlers) {
                expect(handlers[handle]).to.not.be.called
              }
            })
          }
        }

        afterEach(() => {
          for (const handle in handlers) {
            handlers[handle].resetHistory()
          }
        })
      })
    }
  }
})

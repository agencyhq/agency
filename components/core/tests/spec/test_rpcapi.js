import EventEmitter from 'events'
import fs from 'fs'
import path from 'path'

import Ajv from 'ajv'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import yaml from 'js-yaml'
import WS from 'ws'
import * as url from 'url'

import RPCServer from '@agencyhq/jsonrpc-ws/lib/server.js'
import RPCClient from '@agencyhq/jsonrpc-ws/lib/client.js'
import spec from '@agencyhq/jsonrpc-ws/lib/spec/v0.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const { expect } = chai
chai.use(chaiAsPromised)
chai.use(sinonChai)

const ajv = new Ajv()
const validateSpec = ajv.compile(spec)

function loadSpec (filepath) {
  const content = fs.readFileSync(filepath, 'utf8')
  const spec = yaml.safeLoad(content)

  return spec
}

function getScopes (spec) {
  const {
    _allScope,
    _anyScope,
    _serviceScope
  } = RPCServer
  const scopes = new Set([_allScope, _serviceScope])
  for (const name in spec.methods) {
    for (const scope of spec.methods[name].scopes) {
      scopes.add(scope)
    }
  }
  for (const name in spec.events) {
    for (const scope of spec.events[name].scopes) {
      scopes.add(scope)
    }
  }

  scopes.delete(_anyScope)

  return scopes
}

describe('RPCAPI Spec', () => {
  const filepath = path.join(__dirname, '../../src/rpcapi.yaml')
  const spec = loadSpec(filepath)

  let server
  let client

  class HTTPServer extends EventEmitter {
    address () {
      return {
        address: 'localhost',
        port: 8080
      }
    }

    close (fn) {
      if (fn) {
        fn()
      }
    }
  }

  class WebSocketServer extends EventEmitter {
    send (message, opts, fn) {
      this._client.emit('message', message)
      if (fn) {
        fn()
      }
    }
  }

  class WebSocketClient extends EventEmitter {
    constructor () {
      super()

      this.readyState = WS.CONNECTING

      this.on('open', () => {
        this.readyState = WS.OPEN
      })

      this.on('close', () => {
        this.readyState = WS.CLOSED
      })

      setImmediate(() => {
        this._fakeWS = new WebSocketServer()
        this._fakeWS._client = this
        server.wss.emit('connection', this._fakeWS, { url: '/' })
        this.emit('open')
      })
    }

    close () {
      setImmediate(() => {
        this.emit('close')
      })
    }

    send (message, opts, fn) {
      this._fakeWS.emit('message', message)
      if (fn) {
        fn()
      }
    }
  }

  const allScopes = getScopes(spec)
  allScopes.add('not-existing-scope')

  const tokens = {}

  for (const scope of allScopes) {
    tokens[`testuser@${scope}`] = {
      user: 'testuser',
      scopes: [scope]
    }
  }

  for (const scope of allScopes) {
    tokens[`otheruser@${scope}`] = {
      user: 'otheruser',
      scopes: [scope]
    }
  }

  for (const scope of allScopes) {
    tokens[`serviceuser@${scope}`] = {
      user: 'serviceuser',
      scopes: [RPCServer._serviceScope, scope]
    }
  }

  it('should load', () => {
    expect(spec).to.be.an('object')
  })

  it('should be of version 0', () => {
    expect(spec.version).to.be.equal(0)
  })

  it('should be valid', () => {
    expect(validateSpec(spec)).to.be.true
  })

  describe('methods', () => {
    for (const methodName in spec.methods) {
      describe(`#${methodName}()`, () => {
        const method = spec.methods[methodName]

        let methodFn

        const authorizedScopes = new Set([
          ...method.scopes,
          RPCServer._allScope
        ])

        beforeEach(async () => {
          server = new RPCServer({
            server: new HTTPServer(),
            authenticate: ({ token }) => tokens[token] || false
          })
          await server.registerSpec(filepath, () => ({ default: sinon.fake() }), () => {})
          server.registerMethod('ready', sinon.fake())

          methodFn = server.methods[methodName].fn
        })

        afterEach(async () => {
          await server.close()
        })

        it('should be registered', () => {
          expect(server.methods[methodName]).to.have.nested.property('fn.isSinonProxy', true)
        })

        for (const token in tokens) {
          const {
            user,
            scopes
          } = tokens[token]

          const isAuthorized = scopes.some(s => authorizedScopes.has(s))
          const isService = new Set(scopes).has('service')

          describe(`access with token ${token}`, () => {
            beforeEach(async () => {
              client = new RPCClient('http://example.com', { WebSocket: WebSocketClient })
              await client.connect()

              await client.auth({ token })
            })

            afterEach(async () => {
              await client.close()
            })

            if (isAuthorized) {
              it('should be allowed', async () => {
                await expect(client.call(methodName, {})).to.eventually.be.fulfilled
                expect(methodFn).to.be.calledOnce

                const [params, context] = methodFn.getCall(0).args
                expect(params).to.be.deep.equal({})
                expect(context).to.have.property('user', user)
              })

              if (isService) {
                it('should be allowed as another user', async () => {
                  await expect(client.call(methodName, {}, { become: 'someotheruser' }))
                    .to.eventually.be.fulfilled
                  expect(methodFn).to.be.calledOnce

                  const [params, context] = methodFn.getCall(0).args
                  expect(params).to.be.deep.equal({})
                  expect(context).to.have.property('user', 'someotheruser')
                })
              } else {
                it('should be prevented as another user', async () => {
                  await expect(client.call(methodName, {}, { become: 'someotheruser' }))
                    .to.eventually.be.rejectedWith('Becoming is forbidden')
                  expect(methodFn).to.not.be.called
                })
              }
            } else {
              it('should be prevented', async () => {
                await expect(client.call(methodName, {}))
                  .to.eventually.be.rejectedWith('Method forbidden')
                expect(methodFn).to.not.be.called
              })
            }
          })
        }
      })
    }
  })

  describe('events', () => {
    for (const eventName in spec.events) {
      describe(`#${eventName}`, () => {
        const event = spec.events[eventName]

        const authorizedScopes = new Set([
          ...event.scopes,
          RPCServer._allScope
        ])

        beforeEach(async () => {
          server = new RPCServer({
            server: new HTTPServer(),
            authenticate: ({ token }) => tokens[token] || false
          })
          await server.registerSpec(filepath, () => ({ default: sinon.fake() }), () => {})
          server.registerMethod('ready', sinon.fake())
        })

        afterEach(async () => {
          await server.close()
        })

        it('should be registered', () => {
          expect(server.notifications[eventName].scopes).to.be.deep.equal(new Set(event.scopes))
        })

        for (const token in tokens) {
          const {
            user,
            scopes
          } = tokens[token]

          const isAuthorized = scopes.some(s => authorizedScopes.has(s))
          const isService = new Set(scopes).has('service')

          describe(`subscribing with token ${token}`, () => {
            beforeEach(async () => {
              client = new RPCClient('http://example.com', { WebSocket: WebSocketClient })
              await client.connect()

              await client.auth({ token })
            })

            afterEach(async () => {
              await client.close()
            })

            if (isAuthorized) {
              it('should be allowed', async () => {
                await expect(client.subscribe(eventName, () => {})).to.eventually.be.fulfilled
              })

              it('should result in notifications being delivered', async () => {
                const fn = sinon.fake()

                await client.subscribe(eventName, fn)

                await server.notify(eventName, 'some')

                expect(fn).to.be.calledOnceWith('some')
              })

              if (isService) {
                it('should deliver notifications for every user', async () => {
                  const fn = sinon.fake()

                  await client.subscribe(eventName, fn)

                  await server.notify(eventName, { user: 'testuser' })
                  await server.notify(eventName, { user: 'otheruser' })

                  expect(fn).to.be.calledTwice
                  expect(fn).to.be.calledWith({ user: 'testuser' })
                  expect(fn).to.be.calledWith({ user: 'otheruser' })
                })
              } else {
                it('should only deliver notifications for this user', async () => {
                  const fn1 = sinon.fake()
                  const fn2 = sinon.fake()

                  await client.subscribe(eventName, fn1)

                  const otherclient = new RPCClient('http://example.com', {
                    WebSocket: WebSocketClient
                  })
                  await otherclient.connect()
                  await otherclient.auth({
                    token: user === 'testuser'
                      ? `otheruser@${scopes[0]}`
                      : `testuser@${scopes[0]}`
                  })

                  await otherclient.subscribe(eventName, fn2)

                  await server.notify(eventName, { user: 'testuser' })
                  await server.notify(eventName, { user: 'otheruser' })

                  try {
                    expect(fn1).to.be.calledOnceWith({ user: 'testuser' })
                    expect(fn2).to.be.calledOnceWith({ user: 'otheruser' })
                  } catch (e) {
                    expect(fn1).to.be.calledOnceWith({ user: 'otheruser' })
                    expect(fn2).to.be.calledOnceWith({ user: 'testuser' })
                  } finally {
                    await otherclient.close()
                  }
                })
              }
            } else {
              it('should be prevented', async () => {
                await expect(client.subscribe(eventName, {}))
                  .to.eventually.be.rejectedWith('notification forbidden')
              })
            }
          })
        }
      })
    }
  })
})

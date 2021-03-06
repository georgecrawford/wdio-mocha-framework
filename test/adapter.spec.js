import sinon from 'sinon'
import { adapterFactory, MochaAdapter } from '../lib/adapter'

/**
 * create mocks
 */
const NOOP = function () {}
let Mocka = sinon.spy()

let addFile = Mocka.prototype.addFile = sinon.spy()
let loadFiles = Mocka.prototype.loadFiles = sinon.spy()
let reporter = Mocka.prototype.reporter = sinon.stub()
let run = Mocka.prototype.run = sinon.stub()
let fullTrace = Mocka.prototype.fullTrace = sinon.stub()

run.returns({
    on: NOOP,
    suite: {
        beforeAll: NOOP,
        beforeEach: NOOP,
        afterEach: NOOP,
        afterAll: NOOP
    }
})

Mocka.prototype.suite = { on: NOOP }

describe('mocha adapter', () => {
    before(() => {
        adapterFactory.__Rewire__('Mocha', Mocka)
        adapterFactory.__Rewire__('wrapCommands', NOOP)
        adapterFactory.__Rewire__('runInFiberContext', NOOP)
        adapterFactory.__Rewire__('executeHooksWithArgs', NOOP)
    })

    describe('factory', () => {
        let MockaAdapter = sinon.spy()
        let run = MockaAdapter.prototype.run = sinon.spy()

        before(() => {
            adapterFactory.__set__('_MochaAdapter', MockaAdapter)
            adapterFactory.run(1, 2, 3, 4)
        })

        it('should create an adapter instance', () => {
            MockaAdapter.calledWith(1, 2, 3, 4).should.be.true()
        })

        it('should immediatelly start run sequenz', () => {
            run.called.should.be.true()
        })

        after(() => {
            adapterFactory.__ResetDependency__('_MochaAdapter')
        })
    })

    describe('MochaAdapter', () => {
        let adapter, load, send, originalCWD

        let config = { framework: 'mocha' }
        let specs = ['fileA.js', 'fileB.js']
        let caps = { browserName: 'chrome' }

        before(() => {
            adapter = new MochaAdapter(1, config, specs, caps)
            load = adapter.load = sinon.spy()
            send = adapter.send = sinon.spy()

            originalCWD = process.cwd
            Object.defineProperty(process, 'cwd', {
                value: function () { return '/mypath' }
            })
        })

        describe('can load external modules', () => {
            it('should do nothing if no modules are required', () => {
                adapter.requireExternalModules()
                load.called.should.be.false()
            })

            it('should load proper external modules', () => {
                adapter.requireExternalModules(['js:moduleA', 'xy:moduleB'], ['yz:moduleC'])
                load.calledWith('moduleA').should.be.true()
                load.calledWith('moduleB').should.be.true()
                load.calledWith('moduleC').should.be.true()
            })

            it('should load local modules', () => {
                adapter.requireExternalModules(['./lib/myModule'])
                load.lastCall.args[0].slice(-20).should.be.exactly('/mypath/lib/myModule')
            })
        })

        describe('sends event messages', () => {
            it('should have proper message payload', () => {
                let err = { unAllowedProp: true, message: 'Uuups' }
                adapter.emit('suite:start', config, err)
                let msg = send.firstCall.args[0]
                msg.runner[1].should.be.exactly(caps)
                msg.err.should.not.have.property('unAllowedProp')
                msg.err.message.should.be.exactly('Uuups')
            })
        })

        describe('runs Mocha tests', () => {
            it('should run return right amount of errors', () => {
                let promise = adapter.run().then((failures) => {
                    failures.should.be.exactly(1234)
                })
                process.nextTick(() => run.callArgWith(0, 1234))
                return promise
            })

            it('should load files, wrap commands and run hooks', () => {
                loadFiles.called.should.be.true()
                addFile.called.should.be.true()
                reporter.called.should.be.true()
                fullTrace.called.should.be.true()
            })
        })

        after(() => {
            Object.defineProperty(process, 'cwd', {
                value: originalCWD
            })
        })
    })

    after(() => {
        adapterFactory.__ResetDependency__('Mocha')
        adapterFactory.__ResetDependency__('wrapCommands')
        adapterFactory.__ResetDependency__('runInFiberContext')
        adapterFactory.__ResetDependency__('executeHooksWithArgs')
    })
})

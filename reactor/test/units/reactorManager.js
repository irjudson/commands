var assert = require('assert')
  , config = require('../config')
  , ReactorManager = require('../../manager')
  , MockReactor = require('./mockReactor')
  , nitrogen = require('nitrogen');

describe('reactorManager', function() {
    var reactor = new MockReactor({ nickname: 'mockreactor' });
    var reactorManager = new ReactorManager(reactor);

    var installFixture = [new nitrogen.Message({ 
            id: '1', 
            ts: new Date(), 
            type: 'reactorCommand', 
            body: { 
                command: 'install',
                module: 'nitrogen-test-app',
                config: {},
                instance_id: '1AZ' 
            } 
        })
    ];

    it('should process install message', function(done) {
        installFixture.forEach(function(message) { reactorManager.process(message); });
        reactorManager.executeQueue();

        setTimeout(function() {
            var state = reactorManager.device.getState();

            assert(state['1AZ'].command, installFixture[0]);
            assert(state['1AZ'].state, 'stopped');

            done();
        }, 300);
    });

    var startFixture = [new nitrogen.Message({ 
            id: '2', 
            ts: new Date(), 
            type: 'reactorCommand', 
            body: { 
                command: 'start',
                instance_id: '1AZ' 
            } 
        })
    ];

    it('should process start message', function(done) {
        startFixture.forEach(function(message) { reactorManager.process(message); });
        reactorManager.executeQueue();

        setTimeout(function() {
            var state = reactorManager.device.getState();

            assert(state['1AZ'].command, startFixture[0]);
            assert(state['1AZ'].state, 'running');

            done();
        }, 300);
    });

    var stopFixture = [new nitrogen.Message({ 
            id: '3', 
            ts: new Date(), 
            type: 'reactorCommand', 
            body: { 
                command: 'stop',
                instance_id: '1AZ' 
            } 
        })
    ];

    it('should process stop message', function(done) {
        stopFixture.forEach(function(message) { reactorManager.process(message); });
        reactorManager.executeQueue();

        setTimeout(function() {
            var state = reactorManager.device.getState();

            assert(state['1AZ'].command, stopFixture[0]);
            assert(state['1AZ'].state, 'stopped');

            done();
        }, 300);
    });

    var uninstallFixture = [new nitrogen.Message({ 
            id: '3', 
            ts: new Date(), 
            type: 'reactorCommand', 
            body: { 
                command: 'uninstall',
                instance_id: '1AZ' 
            } 
        })
    ];

    it('should process uninstall message', function(done) {
        uninstallFixture.forEach(function(message) { reactorManager.process(message); });
        reactorManager.executeQueue();

        setTimeout(function() {
            var state = reactorManager.device.getState();

            assert(state['1AZ'].command, uninstallFixture[0]);
            assert(state['1AZ'].state, 'uninstalled');

            done();
        }, 300);
    });

});
var assert = require('assert')
  , config = require('../config')
  , ReactorManager = require('../../manager')
  , MockReactor = require('./mockReactor')
  , nitrogen = require('nitrogen');

describe('reactorManager', function() {

    var messageQueueFixture1 = [{ 
        id: '1', 
        ts: new Date(), 
        type: 'reactorCommand', 
        body: { 
            command: 'start',
            instance_id: '1AZ' 
        } 
    }];

    var messageQueueFixture2 = [{ 
        id: '1', 
        ts: new Date(), 
        type: 'reactorCommand', 
        body: { 
            command: 'start', 
            instance_id: '1AZ' 
        } 
    }, { 
        id: '2', 
        ts: new Date(), 
        type: 'reactorState',   
        body: { 
            state: 'started', 
            instance_id: '1AZ' 
        } 
    }, { 
        id: '3', 
        ts: new Date(), 
        type: 'reactorCommand', 
        body: { 
            command: 'stop',
            instance_id: '1AZ' 
        } 
    }];

    function loadFixture(reactorManager, fixture) {
        reactorManager.messageQueue = fixture.map(function(obj) {
            return new nitrogen.Message(obj);
        });
    }

    it('should be able to process message stream with start to current state', function(done) {
        var service = new nitrogen.Service(config);

        var reactor = new MockReactor();
        var reactorManager = new ReactorManager(reactor);

        loadFixture(reactorManager, messageQueueFixture1);

        reactorManager.executeQueue();

        assert.equal(reactorManager.reactorState['1AZ'].command.body.command, 'start');
        assert.equal(reactor.state, 'started');

        done();
    });
});
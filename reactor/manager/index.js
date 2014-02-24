var nitrogen = require('nitrogen');

function ReactorManager() {
    nitrogen.CommandManager.apply(this, arguments);

    this.reactorState = {};
}

ReactorManager.prototype = Object.create(nitrogen.CommandManager.prototype);
ReactorManager.prototype.constructor = ReactorManager;

ReactorManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('No reactor attached to reactor manager.'));

    var self = this;
    var newState = this.buildState();
    console.log('new state: ' + JSON.stringify(newState));

    // look for a state change and execute it.
    // if there is more than one state change, we catch that at the next execution.
    Object.keys(newState).forEach(function(instanceId) {

        var newCommand = newState[instanceId].command;
        var currentCommand = self.reactorState[instanceId] ? self.reactorState[instanceId].command : null;

        if (!currentCommand || 
            newCommand.body.command !== currentCommand.body.command) {
            switch (newCommand.body.command) {
                case 'start': {
                    self.device.start(newCommand, callback);
                    // TODO: start app in reactor
                    break;
                }

                case 'stop': {
                    if (currentCommand) {
                        // TODO: stop app in reactor
                        self.device.stop(newCommand, callback);                        
                    }
                    break;
                }

                case 'install': {
                    self.device.install(newCommand, callback);
                    break;
                }

                case 'uninstall': {
                    self.device.uninstall(newCommand, callback);
                }
            }
        }
    });

    this.reactorState = newState;
};

ReactorManager.prototype.buildState = function() {
    var state = {};
    this.messageQueue.forEach(function(message) {

        state[message.body.instance_id] = state[message.body.instance_id] || {};

        if (message.is('reactorCommand')) {
            state[message.body.instance_id].command = message;
        } else {
            state[message.body.instance_id].state = message;
        }
    });

    return state;
};

ReactorManager.prototype.isCommand = function(message) {
    return (message.is('reactorCommand'));
};

ReactorManager.prototype.isRelevant = function(message) {
    return (message.is('reactorCommand') || message.is('reactorState'));
};

ReactorManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (nitrogen.CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;

    // we only want to execute install and uninstall commands once.

    // we only want to execute start and stop commands if they don't
    // match the current state of the reactor.  this means on restart of a reactor
    // we might execute the commands again.

    return downstreamMsg.is('reactorState') && 
           upstreamMsg.is('reactorCommand') &&
           downstreamMsg.responseTo(upstreamMsg) &&
           (upstreamMsg.body.command === 'install' || 
            upstreamMsg.body.command === 'uninstall')

        || downstreamMsg.is('reactorStatus') && upstreamMsg.is('reactorStatus')
        || downstreamMsg.is('reactorCommand') && upstreamMsg.is('reactorCommand') &&
           downstreamMsg.body.instance_id === upstreamMsg.body.instance_id;
};

ReactorManager.prototype.start = function(session, callback) {
    var filter = {
        $and: [ 
            { $or: [ { to: this.device.id }, { from: this.device.id } ] },
            { $or: [ { type: 'reactorCommand'}, { type: 'reactorState' } ] }
        ]
    };

    return nitrogen.CommandManager.prototype.start.call(this, session, filter, callback);
};

module.exports = ReactorManager;
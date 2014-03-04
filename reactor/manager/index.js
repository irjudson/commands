var nitrogen = require('nitrogen');

function ReactorManager() {
    nitrogen.CommandManager.apply(this, arguments);

    this.reactorState = {};

    var self = this;
    process.on('exit', function() {
        self.device.shutdown();
    });
}

ReactorManager.prototype = Object.create(nitrogen.CommandManager.prototype);
ReactorManager.prototype.constructor = ReactorManager;

ReactorManager.prototype.currentCommands = function() {
    var currentCommands = {};
    this.messageQueue.forEach(function(message) {
        if (message.is('reactorCommand')) {
            currentCommands[message.body.instance_id] = message;
        }
    });

    return currentCommands;
};

ReactorManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('No reactor attached to reactor manager.'));

    var self = this;
    var currentCommands = this.currentCommands();
    var currentState = this.device.getState();

    console.log('current commands: ' + JSON.stringify(currentCommands));
    console.log('current state: ' + JSON.stringify(currentState));

    // look for a state change and execute it.
    // if there is more than one state change, we catch that at the next execution.
    Object.keys(currentCommands).forEach(function(instanceId) {

        console.log('instance id: ' + instanceId);

        var currentCommand = currentCommands[instanceId];

        console.log('current command: ' + JSON.stringify(currentCommand));

        if (!currentState[instanceId] || !currentState[instanceId].command ||
             currentCommand.body.command !== currentState[instanceId].command) {
            switch (currentCommand.body.command) {
                case 'install': {
                    console.log('executing install');
                    self.device.install(currentCommand, self.statusCallback());
                    break;
                }

                case 'start': {
                    console.log('executing start');
                    self.device.start(self.session, currentCommand, self.statusCallback());
                    break;
                }

                case 'stop': {
                    console.log('executing stop');
                    self.device.stop(currentCommand, self.statusCallback());
                    break;
                }

                case 'uninstall': {
                    console.log('executing uninstall');
                    self.device.uninstall(currentCommand, self.statusCallback());
                    break;
                }
            }
        }
    });
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

ReactorManager.prototype.statusCallback = function() {
    var self = this;

    return function(err, command) {
        var state = self.device.getState();

        if (err) {
            self.session.log.error(err);
        }

        var stateMessage = new nitrogen.Message({
            type: 'reactorState',
            response_to: [ command.id ],
            body: {
                state: state
            }
        });

        stateMessage.send(self.session);
    };
}

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
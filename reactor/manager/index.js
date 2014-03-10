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
    var currentState = this.device.status();

    // look for a state change and execute it.
    // if there is more than one state change, we catch that at the next execution.
    Object.keys(currentCommands).forEach(function(instanceId) {
        var currentCommand = currentCommands[instanceId];

        if (!currentState[instanceId] || !currentState[instanceId].command ||
             currentCommand.body.command !== currentState[instanceId].command) {
            switch (currentCommand.body.command) {
                case 'install': {
                    if (self.session) self.session.log.info('ReactorManager: executing install of instance: ' + currentCommand.body.instance_id + ": " + currentCommand.body.module + '@' + currentCommand.body.version);
                    self.device.install(currentCommand, self.statusCallback(), callback);
                    break;
                }

                case 'start': {
                    if (self.session) self.session.log.info('ReactorManager: executing start of instance: ' + currentCommand.body.instance_id);
                    self.device.start(self.session, currentCommand, self.statusCallback(), callback);
                    break;
                }

                case 'stop': {
                    if (self.session) self.session.log.info('ReactorManager: executing stop of instance: ' + currentCommand.body.instance_id);
                    self.device.stop(currentCommand, self.statusCallback(), callback);
                    break;
                }

                case 'uninstall': {
                    if (self.session) self.session.log.info('ReactorManager: executing uninstall of instance: ' + currentCommand.body.instance_id);
                    self.device.uninstall(currentCommand, self.statusCallback(), callback);
                    break;
                }
            }
        }
    });
};

ReactorManager.prototype.isCommand = function(message) {
    return message.is('reactorCommand');
};

ReactorManager.prototype.isRelevant = function(message) {
    return message.is('reactorCommand') || message.is('reactorState');
};

ReactorManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (nitrogen.CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;

    // we only want to execute install and uninstall commands once.

    // we only want to execute start and stop commands if they don't
    // match the current state of the reactor.  this means on restart of a reactor
    // we might execute the commands again.

    var obsoleted = downstreamMsg.is('reactorState') && upstreamMsg.is('reactorCommand') && downstreamMsg.isResponseTo(upstreamMsg)
        || downstreamMsg.is('reactorStatus') && upstreamMsg.is('reactorStatus')
        || downstreamMsg.is('reactorCommand') && upstreamMsg.is('reactorCommand') &&
           downstreamMsg.body.instance_id === upstreamMsg.body.instance_id;

    return obsoleted;
};

ReactorManager.prototype.restore = function(callback) {
    var self = this;
    var state = {};

    nitrogen.Message.find(this.session, 
        { type: 'reactorState', from: this.device.id }, { ts: -1, limit: 1 }, 
        function(err, messages) {
            if (err) return callback(err);

            if (messages.length > 0) {
                self.device.instances = messages[0].body.state || {};
                self.session.log.info('restoring reactor from reactorState @ ' + messages[0].ts);
            } else {
                self.session.log.info("no reactorState messages found. starting clean.");
            }

            for (var instanceId in self.device.instances) {
                self.session.log.info('instance id: ' + instanceId + ' is in state: ' + self.device.instances[instanceId].state);
                if (self.device.instances[instanceId].state === 'running') {
                    self.session.log.info('---> starting');
                    self.device.start(self.session, self.device.instances[instanceId].command, self.statusCallback()); 
                }
            }

            self.statusCallback()(null, null, self.device.status());
            return callback();
        }
    );
};

ReactorManager.prototype.statusCallback = function() {
    var self = this;

    return function(err, command, state) {
        if (command)
            var responseTo = [ command.id ];

        if (err) {
            self.session.log.error(err);
        }

        var stateMessage = new nitrogen.Message({
            type: 'reactorState',
            response_to: responseTo,
            body: {
                state: state
            }
        });

        self.process(stateMessage);
        stateMessage.send(self.session);
    };
};

ReactorManager.prototype.start = function(session, callback) {
    var self = this;
    this.session = session;

    this.restore(function(err) {
        if (err) return session.log.error('failed to restore reactor: ' + err);

        var filter = {
            $and: [ 
                { $or: [ { to: self.device.id }, { from: self.device.id } ] },
                { $or: [ { type: 'reactorCommand'}, { type: 'reactorState' } ] }
            ]
        };

        return nitrogen.CommandManager.prototype.start.call(self, session, filter, callback);
    });
};

module.exports = ReactorManager;
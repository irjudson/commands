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

ReactorManager.prototype.isNop = function(executeCommand) {
    var currentState = this.device.status();
    var instanceId = executeCommand.body.instance_id;

    if (!currentState[instanceId]) return false;
    if (!currentState[instanceId].command) return false;

    if (executeCommand.body.command === "uninstall" &&
        currentState[instanceId].state === "uninstalling") {
        return true;
    }

    if (executeCommand.body.command === "install" &&
        currentState[instanceId].state === "installing") {
        return true;
    }

    if (executeCommand.body.command === "start" &&
        currentState[instanceId].state === "running") {
        return true;
    }

    if (executeCommand.body.command === "stop" &&
        currentState[instanceId].state === "stopped") {
        return true;
    }

    return false;
};

ReactorManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('No reactor attached to reactor manager.'));

    var activeCommands = this.activeCommands();
    if (activeCommands.length === 0) {
        this.session.log.info('ReactorManager::executeQueue: no active commands to execute.');
        return callback();
    }

    var executeCommand = activeCommands[0];
    var statusCallback = this.statusCallback();

    if (this.isNop(executeCommand)) {
        this.session.log.info('ReactorManager::executeQueue: isNop: ' + executeCommand.body.command + ' skipping.');
        statusCallback(null, executeCommand, this.device.status());
        return callback();
    }

    switch (executeCommand.body.command) {
        case 'install': {
            if (this.session) this.session.log.info('ReactorManager: executing install of instance: ' + executeCommand.body.instance_id + ": " + executeCommand.body.module + '@' + executeCommand.body.version);
            this.device.install(executeCommand, statusCallback, callback);
            break;
        }

        case 'start': {
            if (this.session) this.session.log.info('ReactorManager: executing start of instance: ' + executeCommand.body.instance_id);
            this.device.start(this.session, executeCommand, statusCallback, callback);
            break;
        }

        case 'stop': {
            if (this.session) this.session.log.info('ReactorManager: executing stop of instance: ' + executeCommand.body.instance_id);
            this.device.stop(executeCommand, statusCallback, callback);
            break;
        }

        case 'uninstall': {
            if (this.session) this.session.log.info('ReactorManager: executing uninstall of instance: ' + executeCommand.body.instance_id);
            this.device.uninstall(executeCommand, statusCallback, callback);
            break;
        }
    }
};

ReactorManager.prototype.isCommand = function(message) {
    return message.is('reactorCommand');
};

ReactorManager.prototype.isRelevant = function(message) {
    return message.is('reactorCommand') || message.is('reactorState');
};

ReactorManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (nitrogen.CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;

    var obsoleted = downstreamMsg.is('reactorState') && upstreamMsg.is('reactorCommand')
        && downstreamMsg.isResponseTo(upstreamMsg)
        || downstreamMsg.is('reactorStatus') && upstreamMsg.is('reactorStatus');

    return obsoleted;
};

ReactorManager.prototype.restore = function(callback) {
    var self = this;
    var state = {};

    var filter = {
       type: 'reactorState',
       tags: nitrogen.CommandManager.commandTag(this.device.id)
    };

    // find the last reactorState message and restore instances to that state.
    //      if instance was stopped -> nop
    //      if instance was installing -> restart installation
    //      if instance was starting -> restart instance
    //      if instance was running -> restart instance
    nitrogen.Message.find(this.session, filter, { ts: -1, limit: 1 },
        function(err, messages) {
            if (err) return callback(err);

            self.device.instances = {};

            if (messages.length > 0) {
                self.session.log.info('restoring reactor from reactorState @ ' + messages[0].ts);

                if (messages[0].body.state) {
                    self.device.instances = messages[0].body.state;
                    var state = messages[0].body.state;
                    Object.keys(state).forEach(function(key) {
                        self.session.log.info('instance: ' + key);
                        self.session.log.info('state : ' + JSON.stringify(state[key]));
                    });                    
                }
            } else {
                self.session.log.info("no reactorState messages found. starting clean.");
            }

            // loop through all of the instances. if there was an ongoing command,
            // add it to the command queue as a synthetic command at the same timestamp
            // at the ts of the reactorState so that later commands can invalidate it.

            for (var instanceId in self.device.instances) {
                self.session.log.info("reactor instance: " + instanceId + " was previously in state: " + self.device.instances[instanceId].state);
                var instanceState = self.device.instances[instanceId];

                // back out these 'in progress' states to their previous state, 'stopped'
                if (instanceState.state === 'running' || instanceState.state === 'starting' || instanceState.state === 'uninstalling') {
                    instanceState.state = 'stopped';
                }

                // unless its 'installing', in which case back it out to undefined.
                if (instanceState.state === 'installing') {
                    instanceState.state = null;
                }

                // if there is an command in the reactorState, it means that it was
                // 'in progress' when the reactor stopped, restart it now by putting it
                // on the command queue, but with the reactorState's ts.
                var command = self.device.instances[instanceId].command;
                if (command) {
                    command.ts = new Date();

                    self.session.log.info("reactor instance: " + instanceId + ": reissuing command: " + command.body.command);

                    self.process(new nitrogen.Message(command));
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
            },
            tags: [ nitrogen.CommandManager.commandTag(self.device.id) ]
        });

        self.process(stateMessage);
        stateMessage.send(self.session, function(err) {
            if (err) console.log('error sending reactor status message: ' + err);
        });
    };
};

ReactorManager.prototype.start = function(session, callback) {
    var self = this;
    this.session = session;

    var filter = {
        tags: nitrogen.CommandManager.commandTag(this.device.id)
    };

    this.restore(function(err) {
        if (err) {
            session.log.error('failed to restore reactor: ' + err);
            return callback(err);
        }

        return nitrogen.CommandManager.prototype.start.call(self, session, filter, callback);
    });
};

module.exports = ReactorManager;

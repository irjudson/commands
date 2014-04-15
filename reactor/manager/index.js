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

    console.log('executeCommand.body.command: ' + executeCommand.body.command);
    console.log('currentState[instanceId].state: ' + currentState[instanceId].state);

    if (executeCommand.body.command === "start" &&
        (currentState[instanceId].state !== "stopped"))
        return true;

    if (executeCommand.body.command === "stop" &&
        (currentState[instanceId].state === "stopped" || currentState[instanceId].state === "stopping"))
        return true;

    if (executeCommand.body.command === "install" &&
        currentState[instanceId].state === "installing")
        return true;

    if (executeCommand.body.command === "uninstall" &&
        currentState[instanceId].state === "uninstalling")
        return true;

    return false;
};

ReactorManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('No reactor attached to reactor manager.'));

    var activeCommands = this.activeCommands();
    if (activeCommands.length === 0) {
        session.log.warn('ReactorManager::executeQueue: no active commands to execute.');
        return callback();
    }

    var executeCommand = activeCommands[0];
    var statusCallback = this.statusCallback();

    if (this.isNop(executeCommand)) {
        console.log('ReactorManager::executeQueue: command is NOP vs. state: skipping.');
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

    // we only want to execute install and uninstall commands once.

    // we only want to execute start and stop commands if they don't
    // match the current state of the reactor.  this means on restart of a reactor
    // we might execute the commands again.

    var obsoleted = downstreamMsg.is('reactorState') && upstreamMsg.is('reactorCommand')
        && downstreamMsg.isResponseTo(upstreamMsg)
        || downstreamMsg.is('reactorStatus') && upstreamMsg.is('reactorStatus')
        || downstreamMsg.is('reactorCommand') && upstreamMsg.is('reactorCommand') &&
           downstreamMsg.body.instance_id === upstreamMsg.body.instance_id;

    return obsoleted;
};

ReactorManager.prototype.restore = function(callback) {
    var self = this;
    var state = {};

    var filter = {
       type: 'reactorState',
       tags: nitrogen.CommandManager.commandTag(this.session)
    };

    // find the last reactorState message and restore instances to that state.
    //      if instance was stopped -> nop
    //      if instance was installing -> restart installation
    //      if instance was running -> restart instance
    nitrogen.Message.find(this.session, filter, { ts: -1, limit: 1 },
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
                if (self.device.instances[instanceId].state === 'running' || self.device.instances[instanceId].state === 'starting') {
                    if (self.device.instances[instanceId].command) {
                        self.session.log.info('---> starting');
                        self.device.start(self.session, self.device.instances[instanceId].command, self.statusCallback());
                    } else {
                        self.session.log.warn('but no command to start instance --> not starting.');
                    }
                } else if (self.device.instances[instanceId].state === 'installing') {
                    if (self.device.instances[instanceId].command) {
                        self.session.log.info('---> installing');
                        self.device.install(self.session, self.device.instances[instanceId].command, self.statusCallback());
                    } else {
                        self.session.log.warn('but no command to install instance --> not installing.');
                    }
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

        console.log("SENDING REACTOR STATE MESSAGE: " + JSON.stringify(stateMessage));

        self.process(stateMessage);
        stateMessage.send(self.session);
    };
};

ReactorManager.prototype.start = function(session, callback) {
    var self = this;
    this.session = session;

    // TODO: remove and use command tags

    var filter = {
        tags: nitrogen.CommandManager.commandTag(this.session.principal.id)
    };

    this.restore(function(err) {
        if (err) return session.log.error('failed to restore reactor: ' + err);

        return nitrogen.CommandManager.prototype.start.call(self, session, filter, callback);
    });
};

module.exports = ReactorManager;
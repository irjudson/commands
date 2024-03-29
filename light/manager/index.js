var nitrogen = require('nitrogen');

function LightManager() {
    nitrogen.CommandManager.apply(this, arguments);
    this.state = {};
}

LightManager.prototype = Object.create(nitrogen.CommandManager.prototype);
LightManager.prototype.constructor = LightManager;

LightManager.prototype.applyCommand = function(command) {
    for (var key in command.body) {
        this.state[key] = command.body[key];
    }
};

LightManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('No light attached to light manager.'));

    var commandIds = [];
    var self = this;

    this.activeCommands().forEach(function(command) {
        self.applyCommand(command);
        commandIds.push(command.id);
    });

    this.device.set(this.state, function(err) {
        if (err) return callback(err);

        var message = new nitrogen.Message({
            type: 'lightState',
            tags: [ nitrogen.CommandManager.commandTag(self.device.id) ],
            response_to: commandIds,
            body: self.state
        });

        message.send(self.session, function(err, messages) {
            if (err) return callback(err);

            self.process(messages[0]);
            callback();
        });
    });
};

LightManager.prototype.isCommand = function(message) {
    return (message.is('lightCommand'));
};

LightManager.prototype.isRelevant = function(message) {
    return (message.is('lightCommand') || message.is('lightState')) && (!this.device || message.from === this.device.id || message.to == this.device.id);
};

LightManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (nitrogen.CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;

    return upstreamMsg.is('lightCommand') && downstreamMsg.is('lightCommand') && downstreamMsg.millisToTimestamp() < 0 || downstreamMsg.is('lightState') && downstreamMsg.isResponseTo(upstreamMsg);
};

LightManager.prototype.process = function(message) {
    nitrogen.CommandManager.prototype.process.apply(this, arguments);

    if (message.is('lightState')) {
        this.state = message.body;
    }
};

LightManager.prototype.start = function(session, callback) {
    // TODO: switch to command tags once they have percolated in.

    var filter = {
        tags: nitrogen.CommandManager.commandTag(this.device.id)
    };

    return nitrogen.CommandManager.prototype.start.call(this, session, filter, callback);
};

module.exports = LightManager;
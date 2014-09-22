var nitrogen = require('nitrogen');

function HeatworksManager() {
    nitrogen.CommandManager.apply(this, arguments);

    // default set_point and current_limit.  will be overridden by message stream.
    this.state = {
        set_point: 10.0,
        current_limit: 25.0
    };
}

HeatworksManager.prototype = Object.create(nitrogen.CommandManager.prototype);
HeatworksManager.prototype.constructor = HeatworksManager;

HeatworksManager.prototype.applyState = function(message) {
    if (message.body.set_point) this.state.set_point = message.body.set_point;
    if (message.body.current_limit) this.state.current_limit = message.body.current_limit;
};

HeatworksManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('No heater attached to Heatworks manager.'));

    var self = this;

    var commandIdsProcessed = [];

    this.activeCommands().forEach(function(command) {
        self.applyState(command);
        commandIdsProcessed.push(command.id);
    });

    this.device.set(this.state, function(err, stateMessage) {
        if (err) return callback(err);

        stateMessage.response_to = commandIdsProcessed;

        stateMessage.send(self.session, function(err, messages) {
            if (err) return callback(err);

            self.process(messages[0]);
            callback();
        });
    });
};

HeatworksManager.prototype.isCommand = function(message) {
    return (message.is('_heatworksCommand'));
};

HeatworksManager.prototype.isRelevant = function(message) {
    return (message.is('_heatworksCommand') || message.is('_heatworksState')) &&
           (!this.device || message.from === this.device.id || message.to == this.device.id);
};

HeatworksManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (nitrogen.CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;

    return downstreamMsg.is('_heatworksCommand') || downstreamMsg.is('_heatworksState') && downstreamMsg.isResponseTo(upstreamMsg);
};

HeatworksManager.prototype.process = function(message) {
    nitrogen.CommandManager.prototype.process.apply(this, arguments);

    if (message.is('_heatworksState')) {
        this.applyState(message);
    }
};

HeatworksManager.prototype.start = function(session, callback) {
    var filter = {
        tags: nitrogen.CommandManager.commandTag(this.device.id)
    };

    return nitrogen.CommandManager.prototype.start.call(this, session, filter, callback);
};

module.exports = HeatworksManager;
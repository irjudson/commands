var nitrogen = require('nitrogen');

function SensorManager() {
    nitrogen.CommandManager.apply(this, arguments);
    this.state = {
        interval: SensorManager.DEFAULT_INTERVAL
    };
    this.measureInterval = null;
}

SensorManager.DEFAULT_INTERVAL = 15 * 60 * 1000; // 15 minutes

SensorManager.prototype = Object.create(nitrogen.CommandManager.prototype);
SensorManager.prototype.constructor = SensorManager;

SensorManager.prototype.applyCommand = function(command) {
    for (var key in command.body) {
        this.state[key] = command.body[key];
    }
};

SensorManager.prototype.takeMeasurement = function(commandIds, callback) {
    var self = this;

    this.device.measure(function(err, messages) {
        if (err) return callback(err);

        messages.forEach(function(message) {
            message.response_to = commandIds;
        });

        nitrogen.Message.sendMany(self.session, messages, function(err, messages) {
            messages.forEach(function(message) {
                self.process(message);
            });

            return callback();
        });
    });
};

SensorManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('No sensor device attached to sensor manager.'));

    var commandIds = [];
    var self = this;

    this.activeCommands().forEach(function(command) {
        self.applyCommand(command);
        commandIds.push(command.id);
    });

    // if there is a previous interval active, drop it.
    if (this.measureInterval)
        clearInterval(this.measureInterval);

    // setup interval
    this.measureInterval = setInterval(function() {
        self.takeMeasurement(commandIds);
    }, this.state.interval);

    // immediately take measurement
    self.takeMeasurement(commandIds, callback);
};

SensorManager.prototype.isCommand = function(message) {
    return (message.is('sensorCommand'));
};

SensorManager.prototype.isRelevant = function(message) {
    return message.is('sensorCommand');
};

SensorManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (nitrogen.CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;

    return upstreamMsg.is('sensorCommand') && downstreamMsg.is('sensorCommand') && downstreamMsg.millisToTimestamp() < 0;
};

SensorManager.prototype.start = function(session, callback) {
    // TODO: switch to command tags once they have percolated in.

    var filter = {
        tags: nitrogen.CommandManager.commandTag(this.device.id)
    };

    return nitrogen.CommandManager.prototype.start.call(this, session, filter, callback);
};

module.exports = SensorManager;
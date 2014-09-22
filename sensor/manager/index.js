var nitrogen = require('nitrogen');

function SensorManager() {
    nitrogen.CommandManager.apply(this, arguments);
    this.state = {
        interval: SensorManager.DEFAULT_INTERVAL
    };
    this.measureInterval = null;
}

SensorManager.DEFAULT_INTERVAL = 30 * 1000; // 30 seconds

SensorManager.prototype = Object.create(nitrogen.CommandManager.prototype);
SensorManager.prototype.constructor = SensorManager;

SensorManager.prototype.applyCommand = function(command) {
    for (var key in command.body) {
        this.state[key] = command.body[key];
    }
};

SensorManager.prototype.measure = function(callback) {
    var self = this;

    this.device.measure(function(err, messages) {
        if (err) return callback(err);

        nitrogen.Message.sendMany(self.session, messages, function(err, messages) {
            messages.forEach(function(message) {
                self.process(message);
            });

            if (callback) return callback();
        });
    });
};

SensorManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('No sensor device attached to sensor manager.'));

    var self = this;

    this.activeCommands().forEach(function(command) {
        self.applyCommand(command);
    });

    this.setupMeasurements();
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

SensorManager.prototype.setupMeasurements = function() {
    var self = this;

    // if there is a previous interval active, drop it.
    if (this.measureInterval)
        clearInterval(this.measureInterval);

    // setup interval
    this.measureInterval = setInterval(function() {
        self.measure();
    }, this.state.interval);
};

SensorManager.prototype.start = function(session, callback) {
    var filter = {
        tags: nitrogen.CommandManager.commandTag(this.device.id)
    };

    var self = this;

    return nitrogen.CommandManager.prototype.start.call(this, session, filter, function() {
        self.setupMeasurements();

        if (callback) return callback();
    });
};

module.exports = SensorManager;

var nitrogen = require('nitrogen');

function MockReactor() {
    nitrogen.Principal.apply(this, arguments);

    this.type = 'reactor';
    this.instances = {};

    var self = this;
}

MockReactor.prototype = Object.create(nitrogen.Principal.prototype);
MockReactor.prototype.constructor = MockReactor;

MockReactor.prototype.getInstanceInfo = function(instanceId) {
    if (!this.instances[instanceId]) {
        this.instances[instanceId] = {};
    }

    return this.instances[instanceId];
};

MockReactor.prototype.status = function() {
    return this.instances;
};

MockReactor.prototype.install = function(command, statusCallback, callback) {
    var self = this;

    this.updateState('installing', command, statusCallback);

    setTimeout(function() {
        self.updateState('stopped', command, statusCallback);

        return callback();
    }, 150);
};

MockReactor.prototype.shutdown = function() {
    console.log('MockReactor: shutting down.');
};

MockReactor.prototype.start = function(session, command, statusCallback, callback) {
    var self = this;

    this.updateState('impersonating', command, statusCallback);

    setTimeout(function() {
        self.updateState('starting', command, statusCallback);

        setTimeout(function() {
            self.updateState('running', command, statusCallback);

            return callback();
        }, 150);

    }, 150);
};

MockReactor.prototype.stop = function(command, statusCallback, callback) {
    var self = this;

    this.updateState('stopping', command, statusCallback);
    setTimeout(function() {
        self.updateState('stopped', command, statusCallback);

        return callback();
    }, 150);
};

MockReactor.prototype.uninstall = function(command, statusCallback, callback) {
    var self = this;

    this.updateState('uninstalling', command, statusCallback);
    setTimeout(function() {
        self.updateState('uninstalled', command, statusCallback);

        return callback();
    }, 150);
};

MockReactor.prototype.updateState = function(state, command, statusCallback) {
    var instanceInfo = this.getInstanceInfo(command.body.instance_id);

    instanceInfo.command = command;
    instanceInfo.state = state;

    statusCallback(null, command);
};

module.exports = MockReactor;
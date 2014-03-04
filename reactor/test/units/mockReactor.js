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

MockReactor.prototype.getState = function() {
    return this.instances;
};

MockReactor.prototype.install = function(command, callback) {
    var self = this;

    this.updateState('installing', command, callback);
    console.log('MockReactor: installing: ' + JSON.stringify(command));

    setTimeout(function() {
        console.log('MockReactor: finished installing -> moving to stopped.');
        self.updateState('stopped', command, callback);
    }, 150);
};

MockReactor.prototype.shutdown = function() {
    console.log('MockReactor: shutting down.');
};

MockReactor.prototype.start = function(session, command, callback) {
    var self = this;

    this.updateState('impersonating', command, callback);

    setTimeout(function() {
        self.updateState('starting', command, callback);

        setTimeout(function() {
            self.updateState('running', command, callback);
        }, 150);

    }, 150);
};

MockReactor.prototype.stop = function(command, callback) {
    var self = this;

    this.updateState('stopping', command, callback);
    setTimeout(function() {
        self.updateState('stopped', command, callback);
    }, 150);
};

MockReactor.prototype.uninstall = function(command, callback) {
    var self = this;

    this.updateState('uninstalling', command, callback);
    setTimeout(function() {
        self.updateState('uninstalled', command, callback);
    }, 150);
};

MockReactor.prototype.updateState = function(state, command, callback) {
    var instanceInfo = this.getInstanceInfo(command.body.instance_id);

    instanceInfo.command = command;
    instanceInfo.state = state;

    console.log('updateState: ' + state + ' command: ' + JSON.stringify(command));

    callback(null, command);
};

module.exports = MockReactor;
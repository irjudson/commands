var nitrogen = require('nitrogen');

function SwitchManager() {
    nitrogen.CommandManager.apply(this, arguments);
}

SwitchManager.prototype = Object.create(nitrogen.CommandManager.prototype);
SwitchManager.prototype.constructor = SwitchManager;

SwitchManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('No switch attached to switch manager.'));

    var self = this;
    if (!this.state) this.state = 0.0;

    // only execute the last command chronologically and reply to all the rest.

    var lastCommand = this.lastActiveCommand();
    if (lastCommand) {
        this.device.set(lastCommand.body.on, function(state, changed) {
            console.log('switchManager: switch set to ' + state);

            var message = new nitrogen.Message({
                type: 'switchState',
                response_to: [ lastCommand.id ],
                body: {
                    on: state
                }
            });

            self.state = state;

            message.send(self.session, function(err, messages) {
                if (err) return callback(err);

                self.process(messages[0]);
                callback();
            });
        });
    }
};

SwitchManager.prototype.isCommand = function(message) {
    return (message.is('switchCommand'));
};

SwitchManager.prototype.isRelevant = function(message) {
    return (message.is('switchCommand') || message.is('switchState')) && (!this.device || message.from === this.device.id || message.to == this.device.id);
};

SwitchManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (nitrogen.CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;

    return downstreamMsg.is('switchCommand') || downstreamMsg.is('switchState') && downstreamMsg.isResponseTo(upstreamMsg);
};

SwitchManager.prototype.process = function(message) {
    nitrogen.CommandManager.prototype.process.apply(this, arguments);

    if (message.is('switchState')) {
        this.state = message.body.on;
        console.log('new switchManager state: ' + this.state);        
    }
};

SwitchManager.prototype.start = function(session, callback) {
    var filter = {
        $and: [ 
            { $or: [ { to: this.device.id }, { from: deviceId } ] },
            { $or: [ { type: 'switchCommand'}, { type: 'switchState' } ] }
        ]
    };

    return nitrogen.CommandManager.prototype.start.call(this, session, filter, callback);
};

module.exports = SwitchManager;

var async = require('async')
  , fs = require('fs')
  , nitrogen = require('nitrogen')
  , path = require('path');

function CameraManager() {
    nitrogen.CommandManager.apply(this, arguments);

    this.history = [];
}

CameraManager.DEFAULT_MOTION_THRESHOLD = 0.03;  // 3% of pixels showing motion.

CameraManager.prototype = Object.create(nitrogen.CommandManager.prototype);
CameraManager.prototype.constructor = CameraManager;

CameraManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('no camera attached to camera manager.'));

    // if there is a queue, for a camera manager that means there is something to do.

    var self = this;
    var messagesGenerated = [];

    this.device.snapshot({}, function(err, shot) {
        if (err) return callback('CameraManager::execute: snapshot failed: ' + err);

        self.history.push(shot);

        // walk through the list of commands and see which ones we can satisfy.
        // as we do satisfy them, add them to response_to and incorporate their attributes.

        var attributes = {};
        attributes.response_to = [];

        self.activeCommands().forEach(function(activeCommand) {
            var testCommandTriggered;
            if (activeCommand.body.command == "motion") {
                testCommandTriggered = function(cb) { self.detectMotion(activeCommand, cb); };
            } else if (activeCommand.body.command == "snapshot") {
                testCommandTriggered = function(cb) { cb(true); };
            }

            testCommandTriggered(function(triggered) {
                if (triggered) {
                    attributes.response_to.push(activeCommand.id);

                    // allow passing through attributes from commands to message
                    if (activeCommand.body.message) {
                        // TODO: need some way to intelligently combine attributes (max 'expires', etc.)
                        for (var key in activeCommand.body.message) {
                            attributes[key] = activeCommand.body.message[key];
                        }
                    }
                }
            });
        });

        // only send a message if we are able to satisfy at least one command in the queue.
        if (attributes.response_to.length > 0) {
            self.sendImage(shot, attributes, function(err, message) {
                if (err) return;

                self.process(message);
                self.resizeHistory();
                callback();
            });
        } else {
            self.resizeHistory();
            callback();
        }
    });
};

CameraManager.prototype.historyRequired = function() {
    var historyRequired = 0;
    this.activeCommands().forEach(function(activeCommand) {
        var cmd = activeCommand.body.command;

        if (cmd === "snapshot")
            historyRequired = Math.max(1, historyRequired);
        else if (cmd === "motion")
            historyRequired = 3;
    });

    return historyRequired;
};

CameraManager.prototype.isRelevant = function(message) {
    return (message.is('cameraCommand') || message.is('image')) && (!this.device || message.from === this.device.id || message.to == this.device.id);
};

CameraManager.prototype.isCommand = function(message) {
    return (message.is('cameraCommand'));
};

CameraManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (nitrogen.CommandManager.obsoletes(downstreamMsg, upstreamMsg)) return true;

    return downstreamMsg.is('cameraCommand') && downstreamMsg.body.command === "cancel" && downstreamMsg.isResponseTo(upstreamMsg.id) ||
        downstreamMsg.is('image') && downstreamMsg.isResponseTo(upstreamMsg) && upstreamMsg.body.command === "snapshot";
};

CameraManager.prototype.resizeHistory = function() {
    // resize history to match up with requirements.

    var sliceStart = Math.max(0, this.history.length - this.historyRequired());
    for (var i=0; i < sliceStart; i++) {
        fs.unlink(this.history[i].path);
    }
    this.history = this.history.slice(sliceStart);
};

CameraManager.prototype.sendImage = function(shot, attributes, callback) {
    var self = this;

    nitrogen.Blob.fromFile(shot.path, function(err, blob) {
        if (err) return callback(err);

        blob.save(self.session, fs.createReadStream(shot.path), function(err, blob) {
            if (err) return callback(err);

            var message = new nitrogen.Message({
                type: blob.message_type,
                link: blob.link,

                body: {
                    url: blob.url
                }
            });

            for (var attribute in attributes) {
                self.session.log.debug('CameraManager::sendImage: setting attribute: ' + attribute + ' to ' + attributes[attribute]);
                message[attribute] = attributes[attribute];
            }

            message.send(self.session, function(err, messages) {
                if (err) return callback("failed to send message for path: " + shot.path + " :" + err);

                self.session.log.info("CameraManager::sendImage: image sent: " + JSON.stringify(messages));

                callback(null, messages[0]);
            });
        });
    });
};

CameraManager.prototype.start = function(session, cameraId, callback) {
    var filter = {
        $and: [ 
            { $or: [ { to: cameraId }, { from: cameraId } ] },
            { $or: [ { type: 'cameraCommand'}, { type: 'image' } ] }
        ]
    };

    return nitrogen.CommandManager.prototype.start.call(this, session, filter, callback);
};

module.exports = CameraManager;
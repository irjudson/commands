var async = require('async')
  , fs = require('fs')
  , nitrogen = require('nitrogen')
  , path = require('path');

function CameraManager() {
    nitrogen.CommandManager.apply(this, arguments);
}

CameraManager.prototype = Object.create(nitrogen.CommandManager.prototype);
CameraManager.prototype.constructor = CameraManager;

CameraManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('no camera attached to camera manager.'));

    var activeCommands = this.activeCommands();
    if (activeCommands.length === 0) {
        session.log.warn('CameraManager::executeQueue: no active commands to execute.');
        return callback();
    }

    var executeCommand = activeCommands[0];

    // TODO: generalize to allow for video command

//    var deviceFunction;

//    if (executeCommand.body.command === 'snapshot')
//        deviceFunction = this.device.snapshot;
//    else
//        deviceFunction = this.device.recordVideo;

    var options = executeCommand.body.options || {};

    var self = this;
    var messagesGenerated = [];

    this.device.snapshot(options, function(stream, shot) {
        // walk through the list of commands and see which ones we can satisfy.
        // as we do satisfy them, add them to response_to and incorporate their attributes.

        var attributes = {};
        attributes.response_to = [];

        activeCommands.forEach(function(activeCommand) {
            if (executeCommand.body.command === activeCommand.body.command) {
                self.session.log.info("CameraManager::executeQueue: command message satisfied: " + JSON.stringify(activeCommand));
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

        // only send a message if we are able to satisfy at least one command in the queue.
        self.sendResponse(stream, shot, attributes, function(err, message) {
            if (err) return callback(err);

            self.process(message);
            callback();
        });
    });
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

CameraManager.prototype.sendResponse = function(stream, shot, attributes, callback) {
    var self = this;

    var blob = new nitrogen.Blob({
        content_type: shot.content_type
    });

    blob.save(self.session, stream, function(err, blob) {
        if (err) return callback(err);

        var message = new nitrogen.Message({
            type: 'image',
            link: blob.link,
            tags: [ nitrogen.CommandManager.commandTag(self.session) ],
            body: {
                url: blob.url
            }
        });

        for (var attribute in attributes) {
            message[attribute] = attributes[attribute];
        }

        self.session.log.info("CameraManager::sendImage: sending message: " + JSON.stringify(message));

        message.send(self.session, function(err, messages) {
            if (err) return callback("CameraManager::sendImage: failed to send message for image: " + err);

            self.session.log.info("CameraManager::sendImage: image sent: " + JSON.stringify(messages));

            callback(null, messages[0]);
        });
    });
};

CameraManager.prototype.start = function(session, callback) {
    // TODO: remove and use command tags once tags have percolated in.

    var filter = {
        type: {
            $in: [
                'cameraCommand',
                'image'
            ]
        },
        $or: [
            { from: this.device.id },
            { to: this.device.id }
        ]
    };

    return nitrogen.CommandManager.prototype.start.call(this, session, filter, callback);
};

module.exports = CameraManager;
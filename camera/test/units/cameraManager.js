var assert = require('assert')
  , config = require('../config')
  , nitrogen = require('nitrogen')
  , path = require('path')
  , CameraManager = require('../../manager');

describe('cameraManager', function() {

    it('should be able to calculate the right amount of history required', function(done) {
        var cameraManager = new CameraManager();
        cameraManager.messageQueue = [
            new nitrogen.Message({
                id: '1',
                type: 'cameraCommand',
                expires: new Date(2050,1,1,0,0,0),
                body: {
                    command: 'motion'
                }
            })
        ];

        assert.equal(cameraManager.historyRequired(), 3);

        cameraManager.messageQueue.push(new nitrogen.Message({
            id: '2',
            type: 'cameraCommand',
            expires: new Date(2050,1,1,0,0,0),
            body: {
                command: 'snapshot'
            }
        }));

        assert.equal(cameraManager.historyRequired(), 3);

        cameraManager.messageQueue = cameraManager.messageQueue.slice(1);
        assert.equal(cameraManager.historyRequired(), 1);

        cameraManager.messageQueue = [];
        assert.equal(cameraManager.historyRequired(), 0);

        done();
    });

    it('should be able to start a CameraManager with a device', function(done) {
        var service = new nitrogen.Service(config);

        var camera = new nitrogen.Device({
            capabilities: "cameraCommand",
            nickname: "camera"
        });

        service.connect(camera, function(err, session, camera) {
            assert.ifError(err);

            new CameraManager(camera).start(session, function(err) {
                assert.ifError(err);

                done();
            });
        });
    });
});

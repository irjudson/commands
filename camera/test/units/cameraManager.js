var assert = require('assert')
  , config = require('../config')
  , nitrogen = require('nitrogen')
  , path = require('path')
  , CameraManager = require('../../manager');

describe('cameraManager', function() {
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

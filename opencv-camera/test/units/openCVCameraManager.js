var assert = require('assert')
  , nitrogen = require('nitrogen')
  , OpenCVCameraManager = require('../../manager')
  , path = require('path');

describe('OpenCVCameraManager', function() {

    it('should detect motion', function(done) {
        var cameraManager = new OpenCVCameraManager();

        var command = new nitrogen.Message({
            id: '1',
            type: 'cameraCommand',
            expires: new Date(2050,1,1,0,0,0),
            body: {
                command: 'motion'
            }
        });

        cameraManager.history = [
            { path: path.join(__dirname, '../fixtures/images/motion0.jpg') },
            { path: path.join(__dirname, '../fixtures/images/motion2.jpg') }
        ];

        cameraManager.detectMotion(command, function(motion) {
            assert.equal(motion, true);
            done();
        });
    });

    it('should not detect motion with static images', function(done) {
        var cameraManager = new OpenCVCameraManager();

        var command = new nitrogen.Message({
            id: '1',
            type: 'cameraCommand',
            expires: new Date(2050,1,1,0,0,0),
            body: {
                command: 'motion'
            }
        });

        cameraManager.history = [
            { path: path.join(__dirname, '../fixtures/images/motion0.jpg') },
            { path: path.join(__dirname, '../fixtures/images/motion0.jpg') }
        ];

        cameraManager.detectMotion(command, function(motion) {
            assert.equal(motion, false);
            done();
        });
    });

});

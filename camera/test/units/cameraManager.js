var assert = require('assert')
  , nitrogen = require('nitrogen')
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

        service.connect(camera, function(err, session) {
            var cameraManager = new CameraManager(camera);
            var gotCallback = false;
            cameraManager.start(session, {}, function(err) {
                assert.equal(err, undefined);
                if (!gotCallback) {
                    gotCallback = true;
                    done();
                }
            });
        });
    });

    it('should detect motion', function(done) {
        var cameraManager = new CameraManager();

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
        var cameraManager = new CameraManager();

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

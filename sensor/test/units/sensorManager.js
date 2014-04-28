var assert = require('assert')
  , config = require('../config')
  , SensorManager = require('../../manager')
  , nitrogen = require('nitrogen');

describe('sensorManager', function() {

    it('should be able to start a SensorManager with a device', function(done) {
        var service = new nitrogen.Service(config);

        var sensorDevice = new nitrogen.Device({
            nickname: "sensor"
        });

        service.connect(sensorDevice, function(err, session) {
            assert.ifError(err);

            new SensorManager(sensorDevice).start(session, function(err) {
                assert.ifError(err);
                done();
            });
        });
    });
});

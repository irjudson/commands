var assert = require('assert')
  , config = require('../config')
  , SensorManager = require('../../manager')
  , nitrogen = require('nitrogen');

describe('sensorManager', function() {

    it('should be able to start a SensorManager with a device', function(done) {
        var service = new nitrogen.Service(config);

        var thermometer = new nitrogen.Device({
            nickname: "sensor",
            tags: ['sends:temperature']
        });

        service.connect(thermometer, function(err, session, thermometer) {
            assert.ifError(err);

            new SensorManager(thermometer).start(session, function(err) {
                assert.ifError(err);
                done();
            });
        });
    });
});

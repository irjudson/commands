var assert = require('assert')
  , config = require('../config')
  , LightManager = require('../../manager')
  , nitrogen = require('nitrogen');

describe('lightManager', function() {

    it('should be able to start a LightManager with a device', function(done) {
        var service = new nitrogen.Service(config);

        var lightDevice = new nitrogen.Device({
            capabilities: "lightCommand",
            nickname: "light"
        });

        service.connect(lightDevice, function(err, session) {
            assert.ifError(err);

            new LightManager(lightDevice).start(session, function(err) {
                assert.ifError(err);
                done();
            });
        });
    });

});

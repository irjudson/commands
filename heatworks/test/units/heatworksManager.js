var assert = require('assert')
  , config = require('../config')
  , HeatworksDevice = require('nitrogen-heatworks')
  , HeatworksManager = require('../../manager')
  , nitrogen = require('nitrogen');

describe('HeatworksManager', function() {

    it('should be able to start a HeatworksManager with a device', function(done) {
        var service = new nitrogen.Service(config);

        var heater = new HeatworksDevice({
            nickname: "heater",
            api_key: process.env.API_KEY
        });

        service.connect(heater, function(err, session, heater) {
            assert.ifError(err);

            new HeatworksManager(heater).start(session, function(err) {
                assert.ifError(err);
                done();
            });
        });
    });

});

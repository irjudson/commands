var assert = require('assert')
  , config = require('../config')
  , LightManager = require('../../manager')
  , nitrogen = require('nitrogen');

describe('lightManager', function() {

    it('should be able to start a LightManager with a device', function(done) {
        var service = new nitrogen.Service(config);

        var lightDevice = new nitrogen.Device({
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

    it('should be able to combine state and commands to reach the right final state', function(done) {
        var lightManager = new LightManager();
        lightManager.process(
            new nitrogen.Message({
                id: '1',
                type: 'lightState',
                expires: new Date(2050,1,1,0,0,0),
                body: {
                    on: true,
                    hue: 255
                }
            })
        );

        lightManager.applyCommand(
            new nitrogen.Message({
                id: '1',
                type: 'lightCommand',
                expires: new Date(2050,1,1,0,0,0),
                body: {
                    sat: 100,
                    hue: 150
                }
            })
        );

        assert.equal(lightManager.state.sat, 100);
        assert.equal(lightManager.state.hue, 150);
        assert.equal(lightManager.state.on, true);

        done();
    });

});

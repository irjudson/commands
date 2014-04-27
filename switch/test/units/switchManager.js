var assert = require('assert')
  , config = require('../config')
  , SwitchManager = require('../../manager')
  , nitrogen = require('nitrogen');

describe('switchManager', function() {

    it('should be able to start a SwitchManager with a device', function(done) {
        var service = new nitrogen.Service(config);

        var switchDevice = new nitrogen.Device({
            nickname: "switch"
        });

        service.connect(switchDevice, function(err, session) {
            assert.ifError(err);

            new SwitchManager(switchDevice).start(session, function(err) {
                assert.ifError(err);
                done();
            });
        });
    });

});

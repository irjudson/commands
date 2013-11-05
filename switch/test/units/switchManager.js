var assert = require('assert')
  , config = require('../config')
  , SwitchManager = require('../../manager').SwitchManager
  , nitrogen = require('nitrogen');

describe('switchManager', function() {

    it('should be able to start a SwitchManager with a device', function(done) {
        var service = new nitrogen.Service(config);

        var switchDevice = new nitrogen.Device({
            capabilities: "switchCommand",
            nickname: "switch"
        });

        service.connect(switchDevice, function(err, session) {
            assert.ifError(err);

            var switchManager = new SwitchManager(switchDevice);
            switchManager.start(session, { $or: [ { to: switchDevice.id }, { from: switchDevice.id } ] }, function(err) {
                assert.ifError(err);
                done();
            });
        });
    });

});

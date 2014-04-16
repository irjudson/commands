var assert = require('assert')
  , config = require('../config')
  , nitrogen = require('nitrogen');

describe('reactor', function() {

    var service = new nitrogen.Service(config);

    it('reactor can run through full lifecycle for application', function(done) {

        // This user is assumed to exist and to be an admin for a reactor named 'reactor'
        // that is used for the tests.

        var user = new nitrogen.User({ nickname: 'user',
                                       email: process.env.NITROGEN_EMAIL,
                                       password: process.env.NITROGEN_PASSWORD });


        var lifecycleSequence = [
            {
                state: 'installing'
            },
            {
                state: 'stopped',
                message: new nitrogen.Message({
                    type: 'reactorCommand',
                    body: {
                        command: 'start',
                        instance_id: '1'
                    }
                })
            },
            {
                state: 'impersonating'
            },
            {
                state: 'starting'
            },
            {
                state: 'running',
                message: new nitrogen.Message({
                    type: 'reactorCommand',
                    body: {
                        command: 'stop',
                        instance_id: '1'
                    }
                })
            },
            {
                state: 'stopping'
            },
            {
                state: 'stopped',
                message: new nitrogen.Message({
                    type: 'reactorCommand',
                    body: {
                        command: 'uninstall',
                        instance_id: '1'
                    }
                })
            },
            {
                state: 'uninstalling'
            }
        ];

        service.authenticate(user, function(err, session, user) {

            nitrogen.Principal.find(session, { type: 'reactor', name: 'Cloud Reactor' }, {}, function(err, principals) {
                assert.ifError(err);

                console.log('here');
                var reactor = principals[0];

                session.onMessage({ from: reactor.id, type: 'reactorState' }, function(message) {
                    var step = lifecycleSequence.shift();

                    if (step) {
                        assert.equal(message.body.state['1'].state, step.state);

                        if (step.message) {
                            step.message.to = reactor.id;
                            step.message.tags = [ nitrogen.CommandManager.commandTag(reactor.id) ];
                            step.message.send(session);
                        }
                    } else {
                        assert(!message.body.state || !message.body.state['1']);
                    }

                    if (!step)
                        done();
                });

                // kickstart the lifecycle with installation after letting subscription connect settle.
                setTimeout(function() {
                    new nitrogen.Message({
                        type: 'reactorCommand',
                        tags: [ nitrogen.CommandManager.commandTag(reactor.id) ],
                        to: reactor.id,
                        body: {
                            command: 'install',
                            module: 'nitrogen-test-app',
                            version: "~0.1",
                            execute_as: reactor.id,
                            params: {},
                            instance_id: '1'
                        }
                    }).send(session);
                    console.log('sent install message: ');
                }, 200);
            });
        });
    });
});

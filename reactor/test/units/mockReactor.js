function MockReactor() {
    this.state = null;
}

MockReactor.prototype.shutdown = function(command) {
    this.state = 'stopped';
};

MockReactor.prototype.start = function(command) {
    this.state = 'started';
};

MockReactor.prototype.stop = function(command) {
    this.state = 'stopped';
};

module.exports = MockReactor;
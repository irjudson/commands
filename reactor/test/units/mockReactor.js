function MockReactor() {
    this.state = null;
}

MockReactor.prototype.start = function(command) {
    this.state = 'started';
};

MockReactor.prototype.stop = function(command) {
    this.state = 'stopped';
};

module.exports = MockReactor;
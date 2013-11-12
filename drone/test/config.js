var nitrogen = require('nitrogen');
   
var config = { 
    host: "localhost",
    protocol: "http",
    http_port: 3030
};

config.store = new nitrogen.Store(config);

module.exports = config;

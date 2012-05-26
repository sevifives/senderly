var Senderscore = {},
  request = require('request');

Senderscore.PATH = 'https://monitor.returnpath.net/api/RepMon/Research/';

Senderscore.getCIDRRange = function (ip, cidr, callback) {
  request(Senderscore.PATH+ip+'%252F'+cidr,callback);
};

Senderscore.getIpAddress = function (ip, callback) {
  request(Senderscore.PATH+ip,callback);
};

Senderscore.getDomain = function (domain, callback) {
  request(Senderscore.PATH+domain,callback);
};
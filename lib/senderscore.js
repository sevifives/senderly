var Senderscore = {},
  config = require('../config.json'),
  request = require('request');

Senderscore.PATH = 'https://monitor.returnpath.net/api/RepMon/Research/';

Senderscore.CREDENTIALS = (function () {
  var ret = this._credentials;
  if (!ret) { this._credentials = ret = Buffer(config.senderscoreUser + ':' + config.senderscorePassword).toString('base64'); }
  return 'Basic '+ret;
})();

Senderscore.IMPACT = {
  'very high':4,
  'high':3,
  'medium':2,
  'low':1
};

Senderscore.getCIDR = function (cidr,callback) {
  cidr = cidr.split('/');
  request({
    uri: Senderscore.PATH+cidr[0]+'%252F'+cidr[1],
    method: 'GET',
    headers: {
      'Authorization': this.CREDENTIALS
    }
  },callback);
};

Senderscore.getIpAddress = function (ip, callback) {
  request({
    uri: Senderscore.PATH+ip,
    method: 'GET',
    headers: {
      'Authorization': this.CREDENTIALS
    }
  },callback);
};

Senderscore.getDomain = function (domain, callback) {
  request({
    uri: Senderscore.PATH+domain,
    method: 'GET',
    headers: {
      'Authorization': this.CREDENTIALS
    }
  },callback);
};

exports.Senderscore = Senderscore;
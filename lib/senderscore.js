var Senderscore = {},
  config = require('../config.json'),
  request = require('request');

Senderscore.PATH = 'https://monitor.returnpath.net/api/RepMon/Research/';
Senderscore.API_VERSION = '2';

Senderscore.getPath = function (endpoint,params) {
  var options = ['v='+Senderscore.API_VERSION], path = this.PATH+endpoint;
  if (params) {
    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        options.push(key+'='+params[key]);
      }
    }
  }

  path += '?' + options.join('&');
  return path;
};

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
  cidr = cidr.split('/'), self = this;
  request({
    uri: self.getPath(cidr[0]+'%252F'+cidr[1]),
    method: 'GET',
    headers: {
      'Authorization': this.CREDENTIALS
    }
  },callback);
};

Senderscore.getIpAddress = function (ip, callback) {
  var self = this;
  request({
    uri: self.getPath(ip),
    method: 'GET',
    headers: {
      'Authorization': this.CREDENTIALS
    }
  },callback);
};

Senderscore.getDomain = function (domain, callback) {
  var self = this;
  request({
    uri: self.getPath(domain),
    method: 'GET',
    headers: {
      'Authorization': this.CREDENTIALS
    }
  },callback);
};

exports.Senderscore = Senderscore;
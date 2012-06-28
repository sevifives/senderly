var dbr = require('../lib/db').mongoDBR,
  allowedAssetTypes = ['ip','domain'];

exports.api = {};

exports.api.getAsset = function (req, res) {
  var apiVersion = req.params.version;
  res.send(apiVersion);
};

exports.api.getAssets = function (req,res) {
  var apiVersion = req.params.version;
  res.send(apiVersion);
};

exports.api.getAllValuesForAssetType = function (req, res) {
  var apiVersion = req.params.version;
  res.send(apiVersion);
};

exports.api.getIp = function (req, res) { res.send(''); };
exports.api.getIps = function (req, res) { res.send(''); };
exports.api.getDomain = function (req, res) { res.send(''); };
exports.api.getDomains = function (req, res) { res.send(''); };
exports.api.getCompanies = function (req, res) { res.send(''); };
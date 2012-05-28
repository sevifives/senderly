var config = require('../config.json'),
    mongolian = require('mongolian'),
    mongoDBR, mongoDBRW, rUser, rPass, rwUser, rwPass,
    serverPath, fullServerPath;

fullServerPath = serverPath = config.mongoHostname + '/' + config.mongoDatabase;
if (config.mongoReadOnlyUser) rUser = config.mongoReadOnlyUser;
if (config.mongoReadOnlyPassword) rPass = config.mongoReadOnlyPassword;
if (rUser && rPass) {
  fullServerPath = rUser + ':' + rPass + '@' + serverPath;
}

exports.mongoDBR = new mongolian('mongo://'+fullServerPath);

if (config.mongoUser) rwUser = config.mongoUser;
if (config.mongoPassword) rwPass = config.mongoPassword;
if (rwUser && rwPass) {
  fullServerPath = rwUser + ':' + rwPass + '@' + serverPath;
}

exports.mongoDBRW = new mongolian('mongo://'+fullServerPath);
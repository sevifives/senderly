var config = require('../config.json'),
    mongolian = require('mongolian'),
    mongoDBR, mongoDBRW, rUser, rPass, rwUser, rwPass,
    serverPath, fullServerPath;

fullServerPath = serverPath = config.mongoHostname + '/' + config.mongoDatabase;
if (config.hasOwnProperty('mongoReadOnlyUser')) rUser = config.mongoReadOnlyUser;
if (config.hasOwnProperty('mongoReadOnlyPassword')) rPass = config.mongoReadOnlyPassword;
if (rUser && rPass) {
  fullServerPath = rUser + ':' + rPass + '@' + serverPath;
}

exports.mongoDBR = new mongolian('mongo://'+fullServerPath);


if (config.hasOwnProperty('mongoUser')) rwUser = config.mongoUser;
if (config.hasOwnProperty('mongoPassword')) rwPass = config.mongoPassword;
if (rwUser && rwPass) {
  fullServerPath = rwUser + ':' + rwPass + '@' + serverPath;
}

exports.mongoDBRW = new mongolian('mongo://'+fullServerPath);


fullServerPath = serverPath = config.mongoHostname + '/' + config.mongoQueueDataBase;
if (config.hasOwnProperty('mongoQueueDataBaseUser')) rwUser = config.mongoQueueDataBaseUser;
if (config.hasOwnProperty('mongoQueueDataBasePassword')) rwPass = config.mongoQueueDataBasePassword;
if (rwUser && rwPass) {
  fullServerPath = rwUser + ':' + rwPass + '@' + serverPath;
}
exports.mongoQueue = new mongolian('mongo://'+fullServerPath);
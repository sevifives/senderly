
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    fs = require('fs'),
    config = require('./config.json'),
    mongolian = require('mongolian'),
    Senderly = require('./lib/senderly').Senderly,
    Senderscore = require('./lib/senderscore');

if (config.mongoDatabase === null || config.mongoDatabase === undefined) {
  throw "You don't have a mongo database setup. Please change the config file.";
}

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(require('connect-assets')());
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);
app.get('/scores/:start?/:end?',routes.getScores);
app.get('/:asset/:id', routes.forAsset);
app.get('/:assets', routes.forAssets);

Senderly.startProcess();

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});


/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    apiRoutes = require('./routes/api'),
    adminRoutes = require('./routes/admin'),
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
  app.use(require('express-validator'));
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
app.get('/domain/:domain/:date?', routes.domainInfo);
app.get('/company/:companyId/:date?', routes.companyInfo);
app.get('/ip/:ip/:date?', routes.ipInfo);

app.get('/api/:version/ips/:property?', apiRoutes.api.getIps);
app.get('/api/:version/domains/:property?', apiRoutes.api.getDomains);

app.get('/api/:version/ip/:date?',apiRoutes.api.getIp);
app.get('/api/:version/domain/:date?',apiRoutes.api.getIp);
app.get('/api/:version/companies',apiRoutes.api.getCompanies);

app.get('/admin', adminRoutes.admin.checkAuth, adminRoutes.admin.index);
app.get('/admin/login', adminRoutes.admin.login);
app.post('/admin/login', adminRoutes.admin.doLogin);
app.post('/admin/company', adminRoutes.admin.checkAuth, adminRoutes.admin.createCompany);
app.put('/admin/company', adminRoutes.admin.checkAuth, adminRoutes.admin.updateCompany);
app.get('/admin/company', adminRoutes.admin.checkAuth, adminRoutes.admin.readCompany);
app.del('/admin/company', adminRoutes.admin.checkAuth, adminRoutes.admin.destroyCompany);

Senderly.startProcess();

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

var bcrypt = require('bcrypt'),
  dbr = require('../lib/db').mongoDBR;

exports.admin = {};

exports.admin.checkAuth = function (req,res) {
  //  if the user isn't logged in, redirect them to a login page

  if(!req.hasOwnProperty('session') || !req.session.login) {
    res.redirect("/admin/login");
    return; // the buck stops here... we do not call next(), because
            // we don't want to proceed; instead we want to show a login page
  }

  res.redirect("/admin");
};

exports.admin.login = function (req,res) {
  res.send('test');
};

exports.admin.doLogin = function (req, res) {
  req.assert('email','required').notEmpty();
  req.assert('email','valid email required').isEmail();

  var errors = req.validationErrors();
  if (errors) {
    res.render('login',{errors: errors});
    return;
  }

  req.sanitize('password').xss();

  dbr.collection('users').findOne({email : req.params.email}, function (err, user) {
    
  });

};

exports.admin.index = function (req,res) {
  res.send('test');
};

exports.admin.readCompany = function (req,res) {

};

exports.admin.createCompany = function (req,res) {

};

exports.admin.updateCompany = function (req,res) {

};

exports.admin.destroyCompany = function (req,res) {

};
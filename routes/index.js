
/*
 * GET home page.
 */

var dbr = require('../lib/db').mongoDBR;

exports.index = function(req, res){
  dbr.collection()
  .group({
    key: 'request',
    ns: 'domainReports',
    initial: {total: 0, domains: {}},
    '$reduce': function (doc, out) {
      var ret = {
        score: doc.senderscore,
        date: doc.processDate
      };
      if (out.domains.hasOwnProperty(doc.request)) {out.domains[doc.request].push(ret);}
      else {out.domains[doc.request] = [ret];}
      out.total++;
    },
    finalize: function (out) {}
  }, function (err,group) {
    res.render('index', {title: 'Senderly - Aggregation made simply', domainData: group.retval[0]});
  });
};

exports.domainInfo = function (req, res) {
  var day = req.params.date;

  if (day) {
    dbr.collection('domainReports').findOne({request: req.params.domain, processDate: new Date(day)},{_id: 0, companyId: 0}, function (err, domainReport) {
      if (domainReport) {
        res.render('domain_report', {title: domainReport.request, domainData: domainReport});
      } else {
        res.render('unknown_asset', {title: req.params.domain, date: day});
      }
    });
  } else {
    dbr.collection('domainReports').find({request: req.params.domain},{_id: 0, companyId: 0}).toArray(function (err, reports) {
      res.render('domain_statistics', {title: req.params.domain, domainReports: reports});
    });
  }
};

exports.ipInfo = function (req, res) {
  var day = req.params.date;

  if (day) {
    dbr.collection('ipReports').findOne({request: req.params.ip, processDate: new Date(day)},{_id: 0, companyId: 0}, function (err, ipReport) {
      if (ipReport) {
        res.render('ip_report', {title: ipReport.request, ipData: ipReport});
      } else {
        res.render('unknown_asset', {title: req.params.ip, date: day});
      }
    });
  } else {
    dbr.collection('ipReports').find({request: req.params.ip},{_id: 0, companyId: 0}).toArray(function (err, reports) {
      res.render('ip_statistics', {title: req.params.ip, ipReports: reports});
    });
  }
};

exports.forAsset = function (req, res) {
  res.send(req.params.asset,req.params.id);
};

exports.forAssets = function (req, res) {
  dbr.collection(req.params.assets).find().toArray(function (err,assets) {
    for (var i=0,l=assets.length;i<l;i++) {
      delete assets[i]._id;
    }
    res.send(assets);
  });
};

exports.getScores = function (req, res) {
  var start = req.params.start,
    end = req.params.end;
  dbr.collection()
  .group({
    key: 'request',
    ns: 'domainReports',
    initial: {total: 0, domains: {}},
    '$reduce': function (doc, out) {
      var ret = {
        score: doc.senderscore,
        date: doc.processDate
      };
      if (out.domains.hasOwnProperty(doc.request)) {out.domains[doc.request].push(ret);}
      else {out.domains[doc.request] = [ret];}
      out.total++;
    },
    finalize: function (out) {}
  }, function (err,group) {
    res.send(group.retval[0]);
  });
};
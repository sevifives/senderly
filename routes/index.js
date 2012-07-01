
/*
 * GET home page.
 */

var dbr = require('../lib/db').mongoDBR;

exports.index = function(req, res){
  var self = this, cache = this._cacheDay, today = new Date().toDateString();

  /*
    Cache the first call for the day.
    This is because this is mostly a pretty page to give a general state
    of scoring so if it's a little behind, that's fine.
  */
  if (cache && cache.day === today) {
    res.render('index', {title: 'Senderly - Aggregation made simply', domainData: cache.reports, scripts: ['domain_chart.js']});
    return;
  }

  dbr.collection('companies').find({},{_id: 0, id: 1, name: 1}).toArray(function (errCompanies, companies) {
    var companiesHash = {};
    for (var company in companies) {
      company = companies[company];
      companiesHash[company.id] = company.name;
    }

    dbr.collection('companyReports').find({},{_id: 0}).toArray(function (errReports, reports) {
      var rawCompanies = {}, report, companyName;
      for (var i=0,l=reports.length;i<l;i++) {
        report = reports[i];
        companyName = companiesHash[report.companyId];
        if (!rawCompanies.hasOwnProperty(companyName)) {

          rawCompanies[companyName] = {
            id: report.companyId.urlSafeEncode(),
            reports: []
          };
        }
        rawCompanies[companyName].reports.push([report.processDate, report.senderScore]);
      }
      self._cacheDay = {
        day: today,
        reports: rawCompanies
      };
      res.render('index', {title: 'Senderly - Aggregation made simply', domainData: rawCompanies, scripts: ['domain_chart.js']});
    });
  });
};

exports.companyInfo = function (req, res) {
  var day = req.params.date, id = req.params.companyId, companyName;
  if (id) {id = id.urlSafeDecode();}

  companyName = new Buffer(id, 'base64').toString('ascii');

  dbr.collection('ipReports').distinct('request',{companyId: id, sender_score: {'$ne': NaN}},function (err, ips) {
    res.render('company_report', {title: companyName, ips: ips, companyId: id});
  });
};

exports.domainInfo = function (req, res) {
  var day = req.params.date, domain = req.params.domain;
  if (day) {
    dbr.collection('domainReports').findOne({request: domain, processDate: day},{_id: 0}, function (err, assetReport) {
      if (!assetReport) {
        res.render('unknown_asset', {title: req.params[asset], date: day});
        return;
      }
      dbr.collection('ipReports').find({companyId: assetReport.companyId, processDate: day},{sender_score: 1, sender_volume: 1, rdns: 1, base_domain: 1, request: 1}, function (err, ipReports) {
        assetReport.ips = ipReports;
        res.render('domain_report', {title: assetReport.request, data: assetReport});
      });
    });
  } else {
    dbr.collection('domainReports').find({request: domain, sender_score: {'$ne': NaN}},{_id: 0, companyId: 0}).toArray(function (err, reports) {
      res.render('domain_statistics', {title: domain, dataReports: reports});
    });
  }
};

exports.ipInfo = function (req, res) {
  var day = req.params.date, ip = req.params.ip, companyId = req.params.companyId;
  if (day) {
    dbr.collection('ipReports').findOne({request: ip, processDate: day},{_id: 0}, function (err, assetReport) {
      if (!assetReport) {
        res.render('unknown_asset', {title: ip, date: day});
        return;
      }
      res.render('ip_report', {title: assetReport.request, data: assetReport});
    });
  } else {
    dbr.collection('ipReports').find({request: ip, sender_score: {'$ne': NaN}},{_id: 0, companyId: 0}).toArray(function (err, reports) {
      res.render('ip_statistics', {title: ip, dataReports: reports});
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
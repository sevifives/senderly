
/*
 * GET home page.
 */

var dbr = require('../lib/db').mongoDBR;

String.prototype.urlSafeEncode = function () {
  return this.replace(/\+/g,'-').replace(/\//g,'_').replace(/\=/g,'*');
};

String.prototype.urlSafeDecode = function () {
  return this.replace(/\-/g,'+').replace(/\_/g,'/').replace(/\*/g,'=');
};

exports.index = function(req, res){
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
      res.render('index', {title: 'Senderly - Aggregation made simply', domainData: rawCompanies});
    });
  });
};

exports.companyInfo = function (req, res) {
  var day = req.params.date, id = req.params.companyId, companyName;
  if (id) {id = id.urlSafeDecode();}

  companyName = new Buffer(id, 'base64').toString('ascii');

  dbr.collection('ipReports').distinct('request',{companyId: id},function (err, ips) {
    res.render('company_report', {title: companyName, ips: ips});
  });
};

exports._assetInfo = function (req, res, asset, day) {
  if (day) {
    dbr.collection(asset+'Reports').findOne({request: req.params.domain, processDate: new Date(day)},{_id: 0}, function (err, assetReport) {
      if (assetReport) {
        if (asset === 'domain') {
          dbr.collection('ipReports').find({companyId: assetReport.companyId, processDate: new Date(day)},{sender_score: 1, sender_volume: 1, rdns: 1, base_domain: 1, request: 1}, function (err, ipReports) {
            assetReport.ips = ipReports;
            res.render('domain_report', {title: assetReport.request, data: assetReport});
          });
        } else {
          res.render(asset+'_report', {title: assetReport.request, data: assetReport});
        }
      } else {
        res.render('unknown_asset', {title: req.params[asset], date: day});
      }
    });
  } else {
    dbr.collection(asset+'Reports').find({request: req.params.ip},{_id: 0, companyId: 0}).toArray(function (err, reports) {
      res.render(asset+'_statistics', {title: req.params[asset], dataReports: reports});
    });
  }
};

exports.domainInfo = function (req, res) {
  var day = req.params.date;
  exports._assetInfo(req, res, 'domain',day);
};

exports.ipInfo = function (req, res) {
  var day = req.params.date;
  exports._assetInfo(req, res, 'ip',day);
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
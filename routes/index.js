
/*
 * GET home page.
 */

var dbr = require('../lib/db').mongoDBR;

exports.index = function(req, res){
  res.render('index', { title: 'Express' });
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
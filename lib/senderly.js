var Senderly = {},
  dbrw = require('./db').mongoDBRW,
  IpReport = require('../models/ip_report').IpReport,
  DomainReport = require('../models/domain_report').DomainReport,
  Senderscore = require('./senderscore').Senderscore;

Senderly.startBatch = function (day) {
  var self = this;
  dbrw.collection('companies').find().forEach(function (company) {
    self.processDomain(company.website,company.id, day);
  });
  dbrw.collection('batches').save({date: day});
};

Senderly.processURL = function (url, companyId, callback) {
  var self = this;
  Senderscore.getDomain(url, function (err, response, body) {
    if (err) {
      console.log('Error - Unable to process domain:',url,'for company', companyId);
      return;
    }
    body = JSON.parse(body);
    callback.call(this,body.data);
  });
};

Senderly.processDomain = function (url, companyId, day, isRelated) {
  if (!url || !companyId) {
    console.log('Error: Unable to process company');
    return;
  }
  var self = this;
  this.processURL(url, companyId, function (data) {
    var related = data.related_domains;
    if (!isRelated && related && related.length>1) {
      for (var i=0,l=related.length;i<l;i++) {
        self.processDomain(related[i], companyId, day, true);
      }
    }
    self.processDomainData(data,companyId,url,day);
  });
};

Senderly.processDomainData = function (data, companyId, domain, day) {
  var domainReport = new DomainReport(data, companyId, domain, day);
  dbrw.collection('domainReports').insert(domainReport);

  var ips = data.ips,ip;

  for (var i=0,l=ips.length;i<l;i++) {
    ip = ips[i];
    this.processIp(ip.ip, companyId, domain, day);
  }
};

Senderly.processIp = function (ip, companyId, domain, day) {
  var self = this;
  Senderscore.getIpAddress(ip, function (err, response, body) {
    if (err) {
      console.log('Error - Unable to process ip:',ip,'for domain', domain);
      return;
    }
    body = JSON.parse(body);
    self.processIpData(body.data,companyId,domain,day);
  });
};

Senderly.processIpData = function (data, companyId, domain, day) {
  var ipReport = new IpReport(data, companyId, domain, day);
  dbrw.collection('ipReports').insert(ipReport);
};

Senderly._initBatch = function (interval) {
  var self = this,
    today = new Date( new Date().toDateString() ); // rounds the day

  dbrw.collection('batches').findOne({date: today}, function (err, roll) {
    if (!roll) {
      self.startBatch(today);
    } else {
      console.log('Senderly has already processed for this day: '+ today.toDateString() );
    }
    setTimeout(function () {
      self._initBatch(interval);
    },interval*86400000);
  });
};

/*
  @startProcess

  Initiates the timer for data collection

  {interval} Number, in days
*/
Senderly.startProcess = function (interval) {
  // This script should really only need to run once a day at the most.
  // Any faster than that is useless since the system works based on days
  if (!interval || interval < 1 || typeof(interval) !== 'number') { interval = 1; }
  else { interval = Math.round(interval); }

  var self = this;

  this._initBatch(interval);
};

exports.Senderly = Senderly;
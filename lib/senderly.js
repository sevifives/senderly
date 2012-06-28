var Senderly = {},
  dbrw = require('./db').mongoDBRW,
  queueDb = require('./db').mongoQueue,
  IpReport = require('../models/ip_report').IpReport,
  DomainReport = require('../models/domain_report').DomainReport,
  CidrReport = require('../models/cidr_report').CidrReport,
  Senderscore = require('./senderscore').Senderscore;

String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

Senderly.startBatch = function (day) {
  var self = this;
  dbrw.collection('logs').insert({type: 'startBatch', day: day, value: 'started'});
  dbrw.collection('companies').find({},{_id: 0}).forEach(function (company) {
    if (company.hasOwnProperty('reportables') && !!company.reportables.length) {
      var reportables = company.reportables, reportable, processType;
      for (var i=0, l=reportables.length;i<l;i++) {
        reportable = reportables[i];

        if (reportable.indexOf('/')!==-1) {
          processType = 'Cidr';
        } else if (reportable.indexOf('-') !== -1) {
          processType = 'IpRange';
        } else {
          processType = 'Ip';
        }

        self['process'+processType](reportable, company.id, company.website, day);
      }
    } else {
      self.processDomain(company.website, company.id, day);
    }
  });
  dbrw.collection('batches').save({date: day});
};

Senderly.postProcess = function (day) {
  dbrw.collection('ipReports').find({processDate: day}).sort({'processDate':1}).toArray(function (err,reports) {
    var ret = {}, report;
    for (var i=0,l=reports.length;i<l;i++) {
      report = reports[i];
      if (ret[report.companyId] === undefined) {
        ret[report.companyId] = {
          total: 0,
          count: 0
        };
      }
      if (!isNaN(report.sender_score)) {
        ret[report.companyId].total += report.sender_score;
        ret[report.companyId].count += 1;
      }
    }

    for (var companyId in ret) {
      dbrw.collection('companyReports').insert({
        companyId: companyId,
        processDate: day,
        senderScore: (ret[companyId].total/ret[companyId].count),
        totalIps: ret[companyId].count
      });
    }

    dbrw.collection('logs').insert({type: 'postProcess', day: day, value: 'complete'});
  });
};

Senderly.prepareToPostProcess = function (day) {
  var self = this;
  queueDb.collection('queuedItems').count(function (err,count) {
    if (count === 0) {
      self.postProcess(day);
    } else {
      self.checkForQueueAndProcess(day);
    }
  });
};

Senderly.removeQueueItem = function (type, companyId, value, day) {
  var self = this;
  queueDb.collection('queuedItems').remove({companyId: companyId, value: value, type: type, day: day}, function () {
    if (self._queueToPostProcess) {
      clearTimeout(self._queueToPostProcess);
    }
    self._queueToPostProcess = setTimeout(function () {
      self.prepareToPostProcess(day);
    }, 1000*60*5); // wait 5 minutes for post processing
  });
};

Senderly.addQueueItem = function (type, companyId, value, day, isRelated) {
  var options = {companyId: companyId, value: value, type: type, day: day};
  if (isRelated !== undefined) options.isRelated = isRelated;
  queueDb.collection('queuedItems').insert(options);
};

Senderly.checkForQueueAndProcess = function (day) {
  var self = this;
  console.log('Checking for queued items...');
  queueDb.collection('queuedItems').find({day: day}, {_id: 0}).toArray(function (err,queuedItems) {
    self.deleteQueue(function () {
      console.log("Senderly queue cleared");
      if (queuedItems && !!queuedItems.length) {
        self.processQueuedItems(queuedItems, day);
      } else {
        console.log('Nothing was queued for ', day.toDateString());
      }
    });
  });
};

Senderly.deleteQueue = function (callback) {
  queueDb.collection('queuedItems').drop(callback);
};

Senderly.processQueuedItems = function (queuedItems,day) {
  for (var i=0,l=queuedItems.length;i<l;i++) {
    queuedItem = queuedItems[i];
    if (queuedItem.type === 'domain') {
      this.processDomain(queuedItem.type, queuedItem.companyId, day, queuedItem.isRelated);
    } else {
      this['process'+queuedItem.type.capitalize()](queuedItem.value, queuedItem.companyId, queuedItem.domain, day);
    }
  }
};

Senderly.processDomain = function (url, companyId, day, isRelated) {
  if (!url || !companyId) {
    dbrw.collection('errors').insert({type: 'domain', companyId: companyId, day: day});
    return;
  }
  var self = this;

  this.addQueueItem('domain',companyId, url, day, isRelated);
  Senderscore.getDomain(url, function (err, response, body) {
    if (err) {
      dbrw.collection('errors').insert({type: 'domain', value: 'url',  companyId: companyId, day: day, error: err});
      return;
    }

    body = JSON.parse(body);

    var data = body.data,
      related = data.related_domains;
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
  var ips = data.ips,ip;

  for (var i=0,l=ips.length;i<l;i++) {
    ip = ips[i];
    this.processIp(ip.ip, companyId, domain, day);
  }

  // since I'll be creating an Ip Report, don't retain the data in the db
  delete domainReport.ips;
  dbrw.collection('domainReports').insert(domainReport);
  this.removeQueueItem('domain',companyId,domain, day);
};

Senderly.processIp = function (ip, companyId, domain, day) {
  var self = this;
  this.addQueueItem('ip', companyId, ip, day);
  Senderscore.getIpAddress(ip, function (err, response, body) {
    if (err) {
      dbrw.collection('errors').insert({type: 'ip', value: ip,  companyId: companyId, day: day, domain: domain, error: err});
      return;
    }
    body = JSON.parse(body);
    self.processIpData(body.data,companyId,domain,day);
  });
};

Senderly.processIpData = function (data, companyId, domain, day) {
  var ipReport = new IpReport(data, companyId, domain, day);
  dbrw.collection('ipReports').insert(ipReport);
  this.removeQueueItem('ip',companyId,ipReport.request, day);
};

Senderly.processIpRange = function (ipRange, companyId, domain, day) {
  var range = ipRange.substr(ipRange.lastIndexOf('.')+1, ipRange.length).split('-'),
    end = parseInt(range[1],10), start = parseInt(range[0],10), ips = [],
    baseIp = ipRange.substr(0,ipRange.lastIndexOf('.'));

  this.addQueueItem('ipRange',companyId,ipRange, day);
  for (i=start;i<=end;i++) {
    ips.push(i);
    this.processIp(baseIp+'.'+i, companyId, domain, day);
  }
  queueDb.collection('queuedItem').remove({companyId: companyId, value: ipRange, type: 'ipRange'});
  this.removeQueueItem('ipRange',companyId,ipRange, day);
};

Senderly.processCidr = function (cidr, companyId, domain, day) {
  var self = this;

  this.addQueueItem('cidr',companyId,cidr, day);
  Senderscore.getCIDR(cidr, function (err, response, body) {
    if (err) {
      dbrw.collection('errors').insert({type: 'cidr', value: cidr, companyId: companyId, day: day, domain: domain, error: err});
      return;
    }
    body = JSON.parse(body);
    self.processCidrData(body.data,companyId, domain, day);
  });
};

Senderly.processCidrData = function (data, companyId, domain, day) {
  var cidrReport = new CidrReport(data, companyId, domain, day);

  var ips = data.ips,ip;
  for (var i=0,l=ips.length;i<l;i++) {
    ip = ips[i];
    this.processIp(ip.ip, companyId, domain, day);
  }
  // don't need to save all that data again since it's only for ips;
  delete cidrReport.ips;
  dbrw.collection('cidrReports').insert(cidrReport);
  this.removeQueueItem('cidr',companyId,data.request, day);
};

Senderly._initBatch = function (interval) {
  var self = this,
    today = new Date( new Date().toDateString() ); // rounds the day

  dbrw.collection('batches').findOne({date: today}, function (err, roll) {
    if (!roll) {
      self.startBatch(today);
    } else {
      console.log('Senderly has already processed for this day: '+ today.toDateString() );
      self.checkForQueueAndProcess(today);
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
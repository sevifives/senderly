var Senderly = {},
  dbrw = require('./db').mongoDBRW,
  queueDb = require('./db').mongoQueue,
  IpReport = require('../models/ip_report').IpReport,
  DomainReport = require('../models/domain_report').DomainReport,
  CidrReport = require('../models/cidr_report').CidrReport,
  Senderscore = require('./senderscore').Senderscore;

/*
===============================================================================

  Senderly internal API items

===============================================================================
*/
/*
  @removeQueueItem
  
  Removes an item from the queue

  {type} String
  {companyId} String
  {value} String
  {day} String
*/
Senderly.removeQueueItem = function (type, companyId, value, day) {
  var self = this;
  queueDb.collection('queuedItems').remove({companyId: companyId, value: value, type: type, day: day}, function () {
    if (self._queueToPostProcess) {
      clearTimeout(self._queueToPostProcess);
    }
    self._queueToPostProcess = setTimeout(function () {
      self.prepareToPostProcess(day);
    }, 1000*60*5); // wait 5 minutes for post processing.
  });
};

/*
  @addError
  
  Adds an item to the errors

  {type} String
  {value} String
  {companyId} String
  {day} String
  {error} String
  {args} Hash
*/
Senderly.addError = function (type, value, companyId, day, error, args) {
  var errorObj = {};
  if (args && typeof(args) === 'object') {
    errorObj = args;
  }

  errorObj.timestamp = new Date();
  errorObj.type = type;
  errorObj.value = value;
  errorObj.companyId = companyId;
  errorObj.day = day;
  errorObj.error = error;

  dbrw.collection('errors').insert(errorObj);
};

Senderly.addLog = function (type, day, value, args) {
  var hash = {};
  if (args && typeof(args) === 'object') {
    hash = args;
  }

  hash.timestamp = new Date();
  hash.type = type;
  hash.day = day;
  hash.value = value;

  dbrw.collection('logs').insert(hash);
};

Senderly.addQueueItem = function (type, companyId, value, day, isRelated) {
  var options = {companyId: companyId, value: value, type: type, day: day};
  if (isRelated !== undefined) options.isRelated = isRelated;
  queueDb.collection('queuedItems').insert(options);
};

Senderly.deleteQueue = function (callback) {
  queueDb.collection('queuedItems').drop(callback);
};

/*
===============================================================================

  Senderly processing methods;

===============================================================================
*/
Senderly.postProcess = function (day) {
  var self = this;
  self.addLog('postProcess',day,'start');
  dbrw.collection('ipReports').find({processDate: day}).sort({'processDate':1}).toArray(function (err,reports) {
    var ret = {}, report;
    if (!reports) {
      self.addLog('postProcess',day,'noRecords');
      return;
    }
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

    self.addLog('postProcess',day,'complete');
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

Senderly.processQueuedItems = function (queuedItems,day) {
  for (var i=0,l=queuedItems.length;i<l;i++) {
    queuedItem = queuedItems[i];
    if (queuedItem.type === 'domain') {
      this.processDomain(queuedItem.type, queuedItem.companyId, day, queuedItem.isRelated);
    } else {
      this['process'+queuedItem.type.capitalize()](queuedItem.value, queuedItem.companyId, queuedItem.domain, day);
    }
  }
  self.addLog('queueCheck',day,'processedItems');
};

Senderly.checkForQueueAndProcess = function (day) {
  var self = this;
  this.addLog('queueCheck',day,'start');
  queueDb.collection('queuedItems').find({day: day}, {_id: 0}).toArray(function (err,queuedItems) {
    self.deleteQueue(function () {
      self.addLog('queueCheck',day,'clearingQueue');
      if (queuedItems && !!queuedItems.length) {
        self.addLog('processQueue',day,'start');
        self.processQueuedItems(queuedItems, day);
      } else {
        self.addLog('queueCheck',day,'noRecords');
      }
    });
    self.addLog('queueCheck',day,'deleteRecords');
  });
};

/*
===============================================================================

  Domain handling

===============================================================================
*/
Senderly.processDomain = function (url, companyId, day, isRelated) {
  if (!url || !companyId) {
    this.addError('domain', url, companyId, day, 'no url', {isRelated: isRelated});
    return;
  }
  var self = this, start = new Date();

  this.addQueueItem('domain',companyId, url, day, isRelated);
  Senderscore.getDomain(url, function (err, response, body) {
    if (body) body = JSON.parse(body);
    if (err || (body.hasOwnProperty('status') && body.status === '400')) {
      self.addError('domain', url, companyId, day, err);
      self.removeQueueItem('domain',companyId,url, day);
      return;
    }

    var data = body.data,
      related = data.related_domains;
    if (!isRelated && related && related.length>1) {
      for (var i=0,l=related.length;i<l;i++) {
        self.processDomain(related[i], companyId, day, true);
      }
    }
    self.processDomainData(data,companyId,url,day,start);
  });
};

Senderly.processDomainData = function (data, companyId, domain, day, start) {
  var domainReport = new DomainReport(data, companyId, domain, day);
  var ips = data.ips,ip;

  for (var i=0,l=ips.length;i<l;i++) {
    ip = ips[i];
    this.processIp(ip.ip, companyId, domain, day);
  }

  // since I'll be creating an Ip Report, don't retain the data in the db
  delete domainReport.ips;
  domain.startProcess = start;
  domain.finishProcess = new Date();
  dbrw.collection('domainReports').insert(domainReport);
  this.removeQueueItem('domain',companyId,domain, day);
};


/*
===============================================================================

  IP Handling

===============================================================================
*/
Senderly.processIp = function (ip, companyId, domain, day) {
  var self = this, start = new Date();
  this.addQueueItem('ip', companyId, ip, day);
  Senderscore.getIpAddress(ip, function (err, response, body) {
    if (body) body = JSON.parse(body);
    if (err || (body.hasOwnProperty('status') && body.status === '400')) {
      self.addError('ip', ip, companyId, day, err, {domain: domain});
      self.removeQueueItem('ip',companyId, ip, day);
      return;
    }
    self.processIpData(body.data,companyId,domain,day, start);
  });
};

Senderly.processIpData = function (data, companyId, domain, day, start) {
  var ipReport = new IpReport(data, companyId, domain, day);

  ipReport.startProcess = start;
  ipReport.finishProcess = new Date();
  dbrw.collection('ipReports').insert(ipReport);
  this.removeQueueItem('ip',companyId,ipReport.request, day);
};

/*
===============================================================================

  IP Range Handling

===============================================================================
*/
Senderly.processIpRange = function (ipRange, companyId, domain, day) {
  var range = ipRange.substr(ipRange.lastIndexOf('.')+1, ipRange.length).split('-'),
    end = parseInt(range[1],10), start = parseInt(range[0],10), ips = [],
    baseIp = ipRange.substr(0,ipRange.lastIndexOf('.'));

  this.addQueueItem('ipRange',companyId,ipRange, day);
  for (i=start;i<=end;i++) {
    ips.push(i);
    this.processIp(baseIp+'.'+i, companyId, domain, day);
  }
  this.removeQueueItem('ipRange',companyId,ipRange, day);
};


/*
===============================================================================

  CIDR Handling

===============================================================================
*/
Senderly.processCidr = function (cidr, companyId, domain, day) {
  var self = this, start = new Date();

  this.addQueueItem('cidr',companyId,cidr, day);
  Senderscore.getCIDR(cidr, function (err, response, body) {
    if (body) body = JSON.parse(body);
    if (err || (body.hasOwnProperty('status') && body.status === '400')) {
      self.addError('cidr', cidr, companyId, day, err, {domain: domain});
      self.removeQueueItem('cidr',companyId,cidr, day);
      return;
    }
    self.processCidrData(body.data,companyId, domain, day, start);
  });
};

Senderly.processCidrData = function (data, companyId, domain, day, start) {
  var cidrReport = new CidrReport(data, companyId, domain, day);

  var ips = data.ips, ip;
  if (ips) {
    for (var i=0,l=ips.length;i<l;i++) {
      ip = ips[i];
      this.processIp(ip.ip, companyId, domain, day);
    }
  }
  // don't need to save all that data again since it's only for ips;
  delete cidrReport.ips;
  cidrReport.startProcess = start;
  cidrReport.finishProcess = new Date();
  dbrw.collection('cidrReports').insert(cidrReport);
  this.removeQueueItem('cidr',companyId,data.request, day);
};

/*
===============================================================================

  Batch Handling

===============================================================================
*/

/*
  @startBatch

  {day} String, fmt (YYYY-M-D)
*/
Senderly.startBatch = function (day) {
  var self = this;
  this.addLog('startBatch',day,'started');
  dbrw.collection('companies').find({},{_id: 0}).forEach(function (company) {
    if (company.hasOwnProperty('reportables') && !!company.reportables.length) {
      var reportables = company.reportables, reportable, processType;
      for (var i=0, l=reportables.length;i<l;i++) {
        reportable = reportables[i];

        if (reportable.indexOf('\/')!==-1) {
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

/*
  @_initBatch

  {interval} Integer, >= 1 whole number
*/
Senderly._initBatch = function (interval) {
  var self = this,
    today = new Date(); // rounds the day
  today = [today.getFullYear(), today.getMonth()+1, today.getDate()].join('-');

  dbrw.collection('batches').findOne({date: today}, function (err, roll) {
    if (!roll) {
      self.startBatch(today);
    } else {
      self.addLog('initBatch',today,'already processed');
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
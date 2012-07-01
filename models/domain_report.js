var Senderscore = require('../lib/senderscore').Senderscore;

var DomainReport = function (data, companyId, domain, day) {
  data.processDate = day;
  data.companyId = companyId;
  var count = 0, total=0,
    ipScore, ips = data.ip, ipAry = [], score;

  for (var ip in ips) {
    score = parseInt(ips[ip].ip_sender_score,10);
    total+=score;
    ++count;
  }

  delete data.ip_auth;
  delete data.ip_hostname;
  delete data.sender_volume;
  delete data.ip_sender_score;

  data.ip_count = count;

  data.ips = ipAry;
  delete data.ip;

  data.senderscore = total/count;
  return data;
};

exports.DomainReport = DomainReport;
var Senderscore = require('../lib/senderscore').Senderscore;

var DomainReport = function (data, companyId, domain, day) {
  data.processDate = day;
  data.companyId = companyId;
  var ipSenderscores = data.ip_sender_score, count = 0, total=0,
    ipScore, ips = data.ip, ipAry = [], score;

  for (var ip in ips) {
    score = parseInt(ipSenderscores[ip],10);
    total+=score;
    ++count;
    ipAry.push({
      ip: ip,
      auth: data.ip_auth[ip],
      hostname: data.ip_hostname[ip],
      senderscore: score,
      senderVolume: data.sender_volume[ip]
    });
  }

  delete data.ip_auth;
  delete data.ip_hostname;
  delete data.sender_volume;
  delete data.ip_sender_score;

  data.ip_count = parseInt(data.ip_count.replace(/\D/g,''),10);

  data.ips = ipAry;
  delete data.ip;

  data.senderscore = total/count;
  return data;
};

exports.DomainReport = DomainReport;
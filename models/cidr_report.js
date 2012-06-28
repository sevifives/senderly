var CidrReport = function(data, companyId, domain, day) {
  var hostnames = data.hostname,
    volumes = data.volume,
    senderVolumes = data.sender_volume,
    senderScores = data.sender_score, score,
    rawIps = data.ip, ips, total = 0, count = 0;

  data.ips = ips = [];
  data.companyId = companyId;
  data.processDate = day;
  data.companyDomain = domain;

  for (var ip in rawIps) {
    if (rawIps.hasOwnProperty(ip)) {
      score = parseInt(senderScores[ip],10);
      total += score;
      ++count;
      ips.push({
        ip: ip,
        volume: (volumes && volumes.hasOwnProperty(ip)) ? volumes[ip] : null,
        sender_volume: (senderVolumes && senderVolumes.hasOwnProperty(ip)) ? senderVolumes[ip] : null,
        hostname: (hostnames && hostnames.hasOwnProperty(ip)) ? hostnames[ip] : null,
        score: (senderScores && senderScores.hasOwnProperty(ip)) ? senderScores[ip] : null
      });
    }
  }

  data.senderscore = total/count;
  
  delete data.hostname;
  delete data.volume;
  delete data.sender_score;

  return data;
};

exports.CidrReport = CidrReport;
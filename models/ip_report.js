var Senderscore = require('../lib/senderscore').Senderscore;

var IpReport = function (data, companyId, domain, day) {
  var impactScores = ['complaint_rate_impact','unknown_rate_impact',
    'rejected_rate_impact','filtered_rate_impact','infrastructure_impact',
    'blacklist_impact'],
    impactScore, domainCount, domains = data.domains, domainsAry = [];

  data.companyId = companyId;
  data.processDate = day;
  data.companyDomain = domain;
  data.sender_score = parseInt(data.sender_score,10);

  // low, medium, high are not great for averaging. Convert them to integers.
  for (var i=0,l=impactScores.length;i<l;i++) {
    impactScore = impactScores[i];
    if (data.hasOwnProperty(impactScore)) {
      data[impactScore] = Senderscore.IMPACT[data[impactScore].toLowerCase()];
    }
  }

  return data;
};

exports.IpReport = IpReport;
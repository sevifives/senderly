var Company = function (name, domain) {
  this.name = name;
  this.id = Buffer(name).toString('base64');
  this.website = domain;

  return this;
};

exports.Company = Company;
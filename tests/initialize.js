const moment = require('moment');
const _ = require('underscore');

module.exports = {
  'Page loads with defaults when given no params' : function (client) {
    client
      .url('http://localhost/pageviews')
      .waitForElementPresent('canvas', 10000);

    const startDate = moment().subtract(20, 'days').format('M/D/YYYY'),
      endDate = moment().subtract(1, 'days').format('M/D/YYYY'),
      dateStr = `${startDate} - ${endDate}`;

    client.expect.element('#range-input').to.have.value.that.equals(dateStr);
    client.expect.element('.aqs-project-input').to.have.value.that.equals('en.wikipedia.org');
    client.expect.element('#platform-select').to.have.value.that.equals('all-access');
    client.expect.element('#agent-select').to.have.value.that.equals('user');
    client.expect.element('.select2-selection__rendered').to.have.text.that.matches(/×Cat\n.*×Dog/m);
    client.expect.element('#chart-legend').to.have.text.that.matches(/\bCat\b.*\bDog\b/);
    client.end();
  },
  'Page loads with values and text matching given params' : function(client) {
    client
      .url('http://localhost/pageviews#start=2016-01-01&end=2016-01-10&project=en.wikivoyage.org&pages=Europe|Asia&platform=desktop&agent=spider')
      .waitForElementPresent('canvas', 10000);

    client.expect.element('#range-input').to.have.value.that.equals('1/1/2016 - 1/10/2016');
    client.expect.element('.aqs-project-input').to.have.value.that.equals('en.wikivoyage.org');
    client.expect.element('#platform-select').to.have.value.that.equals('desktop');
    client.expect.element('#agent-select').to.have.value.that.equals('spider');
    client.expect.element('.select2-selection__rendered').to.have.text.that.matches(/Europe\n.*Asia/m);
    client.expect.element('#chart-legend').to.have.text.that.matches(/\bEurope\b.*\bAsia\b/);
    client.end();
  }
};

const moment = require('moment');
const _ = require('underscore');

module.exports = {
  'Page loads with defaults when given no params': client => {
    client
      .url('http://localhost/pageviews/index')
      .waitForElementPresent('canvas', 10000);

    /** starting zeros are included in case it's a one-digit month, and IE decides to add the leading zero */
    const startDate = moment().subtract(20, 'days'),
      endDate = moment().subtract(1, 'days'),
      dateStr = `0?${startDate.format('M/D/YYYY')} - 0?${endDate.format('M/D/YYYY')}`,
      dateStrIE = `${startDate.format('YYYY-MM-DD')} - ${endDate.format('YYYY-MM-DD')}`;

    /** also including moment() - 21 days due to timezone anolomy of node vs selenium driver */
    const startDate2 = moment().subtract(21, 'days'),
      endDate2 = moment().subtract(2, 'days'),
      dateStr2 = `0?${startDate2.format('M/D/YYYY')} - 0?${endDate2.format('M/D/YYYY')}`,
      dateStr2IE = `${startDate2.format('YYYY-MM-DD')} - ${endDate2.format('YYYY-MM-DD')}`;

    /** replace \/ with \/0? to allow for leading zeros */
    const dateRegex = new RegExp(`${dateStr.replace(/\//g, '\/0?')}|${dateStr2.replace(/\//g, '\/0?')}|${dateStrIE}|${dateStr2IE}`);

    client.expect.element('#range-input').to.have.value.that.match(dateRegex);
    client.expect.element('.aqs-project-input').to.have.value.that.equals('en.wikipedia.org');
    client.expect.element('#platform-select').to.have.value.that.equals('all-access');
    client.expect.element('#agent-select').to.have.value.that.equals('user');
    client.expect.element('.select2-selection__rendered').to.have.text.that.matches(/×Cat\n.*×Dog/m);
    client.expect.element('#chart-legend').to.have.text.that.matches(/\bCat\b[\s\S]*\bDog\b/);
    client.end();
  },
  'Page loads with values and text matching given params': client => {
    client
      .url('http://localhost/pageviews/index#start=2016-01-01&end=2016-01-10&project=en.wikivoyage.org&pages=Europe|Asia&platform=desktop&agent=spider')
      .waitForElementPresent('canvas', 10000);

    client.expect.element('#range-input').to.have.value.that.matches(/0?1\/0?1\/2016 - 0?1\/10\/2016|2016-01-01 - 2016-01-10/);
    client.expect.element('.aqs-project-input').to.have.value.that.equals('en.wikivoyage.org');
    client.expect.element('#platform-select').to.have.value.that.equals('desktop');
    client.expect.element('#agent-select').to.have.value.that.equals('spider');
    client.expect.element('.select2-selection__rendered').to.have.text.that.matches(/Europe\n.*Asia/m);
    client.expect.element('#chart-legend').to.have.text.that.matches(/\bEurope\b[\s\S]*\bAsia\b/);
    client.end();
  }
};

const moment = require('moment');
const _ = require('underscore');
const expect = require('chai').expect;

module.exports = {
  'Changing chart type updates the view and sets localStorage': client => {
    client
      .url('http://localhost/pageviews/index')
      .waitForElementPresent('canvas', 10000);

    client.click('body'); // IE10

    // Bar
    client.click('.js-test-change-chart');
    client.expect.element('#chart-type-modal').to.be.visible.after(1000);
    client.click('.js-test-bar-chart');
    client.expect.element('.aqs-chart').to.be.visible.after(1000);
    client.execute('return localStorage[\'pageviews-chart-preference\']', [], response => {
      client.expect(response.value).to.equal('Bar');
    });
    client.pause(1000);

    // Pie
    client.click('.js-test-change-chart');
    client.expect.element('#chart-type-modal').to.be.visible.after(1000);
    client.click('.js-test-pie-chart');
    client.expect.element('.aqs-chart').to.be.visible.after(1000);
    client.execute('return localStorage[\'pageviews-chart-preference\']', [], response => {
      client.expect(response.value).to.equal('Pie');
    });
    client.pause(1000);

    // Back to Line
    client.click('.js-test-change-chart');
    client.expect.element('#chart-type-modal').to.be.visible.after(1000);
    client.click('.js-test-line-chart');
    client.expect.element('.aqs-chart').to.be.visible.after(1000);
    client.execute('return localStorage[\'pageviews-chart-preference\']', [], response => {
      client.expect(response.value).to.equal('Line');
    });
  },
  'Changing settings updates view and sets localStorage': client => {
    client.pause(1000);
    client.click('.js-test-settings');
    client.expect.element('#settings-modal').to.be.visible.after(1000);
    client.click('.js-test-opensearch');
    client.click('.js-test-format-numbers');
    client.click('.js-test-localize-dates');
    client.click('.save-settings-btn');
    client.execute('return localStorage[\'pageviews-settings-autocomplete\']', [], response => {
      client.expect(response.value).to.equal('autocomplete_redirects');
    });
    client.execute('return localStorage[\'pageviews-settings-numericalFormatting\']', [], response => {
      client.expect(response.value).to.equal('false');
    });
    client.execute('return localStorage[\'pageviews-settings-localizeDateFormat\']', [], response => {
      client.expect(response.value).to.equal('false');
    });

    client.end();
  }
};

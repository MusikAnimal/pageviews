const moment = require('moment');
const _ = require('underscore');

module.exports = {
  'Loads with defaults when given no params': client => {
    client
      .url('http://localhost/siteviews/index?debug=true')
      .waitForElementPresent('canvas', 10000);
    client.expect.element('#platform-select').to.have.value.that.equals('all-access');
    client.expect.element('#agent-select').to.have.value.that.equals('user');
    client.expect.element('.select2-selection__rendered').to.have.text.that.matches(/×fr.wikipedia.org\n.*×de.wikipedia.org/m).after(5000);
    // list is by default sorted by number of pageveiws, so could be frwiki or dewiki
    client.expect.element('.output-list').to.have.text.that.matches(
      /\bfr.wikipedia.org\b[\s\S]*\bde.wikipedia.org\b|\bde.wikipedia.org\b[\s\S]*\bfr.wikipedia.org\b/
    );
  },
  'Changing to all projects disables current project list and shows all of Wikimedia': client => {
    client.click('#all-projects');
    client.pause(1000);
    client.assert.cssClassPresent('.site-selector', 'disabled');
  },
  'Changing to unique devices properly updates form and view': client => {
    // first go to mobile-app and spider
    client.click('#platform-select option:nth-child(3)');
    client.expect.element('#platform-select').value.to.equal('mobile-app');
    client.click('#agent-select option:nth-child(3)');
    client.expect.element('#agent-select').value.to.equal('spider');

    // switch to unique devices
    client.setValue('#data-source-select', 'unique-devices');
    client.execute('$(\'#data-source-select\').trigger(\'change\')');

    client.pause(3000);

    // Safari fix
    client.click('#data-source-select');
    client.click('#data-source-select option:nth-child(2)');

    client.pause(50000);

    // platform should now be 'mobile-site' and agent should be 'user'
    client.expect.element('#platform-select').value.to.equal('mobile-site');
    client.expect.element('#agent-select').value.to.equal('user');

    // all projects selector should be hidden
    client.expect.element('.all-projects-selector').to.not.be.visible;
  },
  'Changing to monthly should go to correct default month values': client => {
    client.click('#date-type-select option:nth-child(2)');
    client.expect.element('#date-type-select').value.to.equal('monthly');
    client.execute('return moment(app.initialMonthStart).format("MMM YYYY")', [], response => {
      client.expect.element('#month-start').value.to.equal(response.value);
    });
  },
  'Changing to pagecounts should go to correct default values': client => {
    client.setValue('#data-source-select', 'pagecounts');
    client.execute('$(\'#data-source-select\').trigger(\'change\')');
    client.click('#data-source-select option:nth-child(3)');

    // these defaults never change based on current date
    client.expect.element('#month-start').value.to.equal('Aug 2015');
    client.expect.element('#month-end').value.to.equal('Jul 2016');

    client.end();
  }
};

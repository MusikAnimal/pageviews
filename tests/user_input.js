const moment = require('moment');
const _ = require('underscore');
const expect = require('chai').expect;

module.exports = {
  'Typing in a page and selecting autocomplete result shows data for that article': client => {
    client
      .url('http://localhost/pageviews/index')
      .waitForElementPresent('canvas', 10000);

    client.click('.select2-container');
    client.setValue('.select2-search__field', 'Sea lion');
    client.expect.element('.select2-results__option:first-child').text.to.equal('Sea lion').after(5000);
    client.click('.select2-results__option:first-child');
    client.expect.element('.aqs-chart').to.be.visible.after(10000);
    client.pause(500);
    client.execute('return $(".aqs-article-selector").val()', [], response => {
      client.expect(_.isEqual(
        response.value,
        ['Cat', 'Dog', 'Sea_lion']
      )).to.equal(true);
    });
    client.expect.element('#chart-legend').to.have.text.that.matches(/\bCat\b.*\bDog\b.*\bSea lion\b/);
  },
  'Removing a page updates the chart accordingly': client => {
    client.click('.select2-selection__choice__remove:first-child');
    client.expect.element('.aqs-chart').to.be.visible.after(10000);
    client.expect.element('#chart-legend').to.have.text.that.matches(/\bDog\b.*\bSea lion\b/);
  },
  'Changing the date range updates the chart, URL parameters, and date selector': client => {
    // disable date formatting
    client.click('body'); // blur
    client.click('.js-test-settings');
    client.waitForElementVisible('#settings-modal', 1000);
    client.click('.js-test-localize-dates');
    client.click('.save-settings-btn');
    client.waitForElementNotVisible('#settings-modal', 1000);

    client.click('.aqs-date-range-selector');
    client.click('.aqs-date-range-selector'); // second time's the charm?
    client.waitForElementVisible('.daterangepicker', 1000);

    startSelector = '.calendar.left tbody tr:nth-child(2) td:first-child';
    client.click(startSelector);
    client.getText(startSelector, result => {
      zeroPadded = ('00' + result.value).slice(-2);
      startDayRegex = new RegExp(`\\d{4}-\\d\\d-${zeroPadded}`);
      client.expect.element('input[name=daterangepicker_start]').value.to.match(startDayRegex);
    });

    endSelector = '.calendar.left tbody tr:nth-child(2) td:nth-child(6)';
    client.click(endSelector);
    client.getText(endSelector, result => {
      zeroPadded = ('00' + result.value).slice(-2);
      endDayRegex = new RegExp(`\\d{4}-\\d\\d-${zeroPadded}`);
      client.expect.element('input[name=daterangepicker_end]').value.to.match(endDayRegex);
    });

    client.click('.applyBtn');
    client.expect.element('.aqs-chart').to.be.visible.after(10000);

    client.execute('return [$("#range-input").val(), location.hash]', [], response => {
      dates = response.value[0].split(' - ');
      dateRegex = new RegExp(`start=${dates[0]}&end=${dates[1]}`);
      client.expect(response.value[1]).to.match(dateRegex);
    });
  },
  'Selecting a special range updates the chart, URL parameters, and date selector': client => {
    client.click('.aqs-date-range-selector');
    client.waitForElementVisible('.daterangepicker', 500);
    client.click('.daterangepicker .ranges li:first-child'); // Last week
    client.waitForElementNotVisible('.daterangepicker', 500);
    client.expect.element('.aqs-chart').to.be.visible.after(10000);

    client.execute('return [$("#range-input").val(), location.hash]', [], response => {
      dates = response.value[0].split(' - ');
      client.expect(moment(dates[1]).diff(moment(dates[0]), 'days')).to.equal(6);
      client.expect(response.value[1]).to.match(/range=last-week/);
    });
  },
  'Selecting a latest range updates the chart, URL parameters, and date selector': client => {
    client.click('.date-latest a:first-child'); // latest 10 days
    client.expect.element('.aqs-chart').to.be.visible.after(10000);

    client.execute('return [$("#range-input").val(), location.hash]', [], response => {
      dates = response.value[0].split(' - ');
      client.expect(moment(dates[0]).isSame(moment().subtract(10, 'days'), 'day'));
      client.expect(moment(dates[1]).isSame(moment(), 'day'));
      client.expect(response.value[1]).to.match(/range=latest-10/);
    });
  },
  'Changing platform and agent updates the chart and URL parameters': client => {
    client.click('#platform-select');
    client.click('#platform-select option:nth-child(2)'); // desktop
    client.expect.element('.aqs-chart').to.be.visible.after(10000);

    client.click('#agent-select');
    client.click('#agent-select option:nth-child(3)'); // spider
    client.expect.element('.aqs-chart').to.be.visible.after(10000);

    client.execute('return location.hash', [], response => {
      client.expect(response.value).to.match(/platform=desktop&agent=spider/);
    });
  },
  'Changing the project clears out the chart and article selector': client => {
    client.click('#project-input');

    // clear the value since clearValue doesn't work in FF :/
    client.setValue('.aqs-project-input', [client.Keys.CONTROL, client.Keys.SHIFT, 'a', client.Keys.BACKSPACE]);

    client.setValue('#project-input', ['de.wikipedia.org', client.Keys.TAB]);
    client.expect.element('.aqs-chart').to.not.be.present.after(500);
    client.execute('return $(".aqs-article-selector").val()', [], response => {
      client.expect(response.value).to.equal(null);
    });
  },
  'Adding article with new project updates the chart and URL parameters': client => {
    client.click('.select2-container');
    client.setValue('.select2-search__field', 'Google');
    client.expect.element('.select2-results__option:first-child').text.to.equal('Google').after(5000);
    client.click('.select2-results__option:first-child');
    client.expect.element('.aqs-chart').to.be.visible.after(10000);

    client.execute('return [$(".aqs-article-selector").val(), location.hash]', [], response => {
      client.expect(_.isEqual(
        response.value[0],
        ['Google']
      )).to.equal(true);

      client.expect(response.value[1]).to.match(/project=de.wikipedia.org&platform=desktop&agent=spider&range=latest-10&pages=Google/);
    });

    client.end();
  }
};

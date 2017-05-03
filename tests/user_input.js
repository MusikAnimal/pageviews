const moment = require('moment');
const _ = require('underscore');

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
    client.execute('return $(".aqs-select2-selector").val()', [], response => {
      client.expect(_.isEqual(
        response.value,
        ['Cat', 'Dog', 'Sea_lion']
      )).to.equal(true);
    });
    client.expect.element('.output-list').to.have.text.that.includes('Cat').after(5000);
    client.expect.element('.output-list').to.have.text.that.includes('Dog').after(5000);
    client.expect.element('.output-list').to.have.text.that.includes('Sea lion').after(5000);
  },
  'Removing a page updates the chart accordingly': client => {
    client.click('.select2-selection__choice__remove:first-child');
    client.expect.element('.aqs-chart').to.be.visible.after(500);
    client.expect.element('.output-list').to.have.text.that.matches(/\bDog\b[\s\S]*\bSea lion\b/);
  },
  'Changing the date range updates the chart, URL parameters, and date selector': client => {
    // disable date formatting
    client.click('body'); // blur
    client.click('.js-test-settings');
    client.waitForElementVisible('#settings-modal', 1000);
    client.click('.js-test-localize-dates');
    client.click('.save-settings-btn');
    client.waitForElementNotVisible('#settings-modal', 1000);

    client.waitForElementVisible('.chart-buttons', 5000);
    client.click('body'); // blur
    client.click('.aqs-date-range-selector');
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

    client.execute('return [$("#range-input").val(), location.search]', [], response => {
      dates = response.value[0].split(' - ');
      dateRegex = new RegExp(`start=${dates[0]}&end=${dates[1]}`);
      client.expect(response.value[1]).to.match(dateRegex);
    });
  },
  'Selecting a special range updates the chart, URL parameters, and date selector': client => {
    client.waitForElementVisible('.chart-buttons', 5000);
    client.click('.aqs-date-range-selector');
    client.waitForElementVisible('.daterangepicker', 1000);
    client.click('.daterangepicker .ranges li:first-child'); // Last week
    client.waitForElementNotVisible('.daterangepicker', 1000);
    client.expect.element('.aqs-chart').to.be.visible.after(10000);

    client.execute('return [$("#range-input").val(), location.search]', [], response => {
      dates = response.value[0].split(' - ');
      client.expect(moment(dates[1]).diff(moment(dates[0]), 'days')).to.equal(6);
      client.expect(response.value[1]).to.match(/range=last-week/);
    });
  },
  'Selecting a latest range updates the chart, URL parameters, and date selector': client => {
    client.waitForElementVisible('.chart-buttons', 5000);
    client.click('.latest-group .dropdown-toggle');
    client.expect.element('.date-latest').to.be.visible.after(1000);
    client.click('.date-latest a:first-child'); // latest 10 days
    client.expect.element('.aqs-chart').to.be.visible.after(10000);

    client.execute('return [$("#range-input").val(), location.search]', [], response => {
      dates = response.value[0].split(' - ');
      client.expect(moment(dates[0]).isSame(moment().subtract(10, 'days'), 'day'));
      client.expect(moment(dates[1]).isSame(moment(), 'day'));
      client.expect(response.value[1]).to.match(/range=latest-10/);
    });
  },
  'Changing platform and agent updates the chart and URL parameters': client => {
    client.waitForElementVisible('.chart-buttons', 5000);
    client.setValue('#platform-select', 'desktop');
    client.execute('$(\'#platform-select\').trigger(\'change\')');
    // try again for Safari
    client.click('#platform-select');
    client.click('#platform-select option:nth-child(2)');
    client.waitForElementVisible('.output', 5000);
    client.pause(1000);
    client.setValue('#agent-select', 'spider');
    client.execute('$(\'#agent-select\').trigger(\'change\')');
    // and again for Safari
    client.click('#agent-select');
    client.click('#agent-select option:nth-child(3)');
    client.waitForElementVisible('.output', 5000);
    client.pause(1000);

    client.execute('return location.search', [], response => {
      client.expect(response.value).to.match(/platform=desktop&agent=spider/);
    });
  },
  'Changing the project clears Select2 and new searches use API for the new project': client => {
    client.click('#project-input');
    client.execute('return $(".aqs-project-input").val("")');
    client.setValue('#project-input', ['de.wikipedia.org']);
    client.execute('return $(".aqs-project-input").trigger("change")');
    client.execute('return $(".aqs-select2-selector").val()', [], response => {
      client.expect(response.value).to.equal(null);
    });

    client.click('.select2-container');
    client.setValue('.select2-search__field', 'Deutsche Fußballnationalmannschaft');
    client.expect.element('.select2-results__option:first-child').text.to.equal('Deutsche Fußballnationalmannschaft').after(5000);
    client.click('.select2-results__option:first-child');
    client.expect.element('.aqs-chart').to.be.visible.after(10000);
    client.pause(500);
    client.click('.select2-container');
    client.setValue('.select2-search__field', 'Deutschland');
    client.expect.element('.select2-results__option:first-child').text.to.equal('Deutschland').after(5000);
    client.click('.select2-results__option:first-child');
    client.expect.element('.aqs-chart').to.be.visible.after(10000);
    client.pause(500);
    client.execute('return $(".aqs-select2-selector").val()', [], response => {
      client.expect(_.isEqual(
        response.value,
        ['Deutsche_Fußballnationalmannschaft', 'Deutschland']
      )).to.equal(true);
    });
    client.expect.element('.output-list').to.have.text.that.matches(
      /\b(Deutsche Fußballnationalmannschaft\b[\s\S]*\bDeutschland|Deutschland\b[\s\S]*\bDeutsche Fußballnationalmannschaft)\b/
    ).after(5000);

    client.end();
  }
};

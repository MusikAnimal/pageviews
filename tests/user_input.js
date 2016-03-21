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
    client.execute('return $(\'.aqs-article-selector\').val()', [], response => {
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

    client.end();
  }
};

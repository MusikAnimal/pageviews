module.exports = {
  'Invalid project shows error and disables form': function(browser) {
    browser
      .url('http://localhost/pageviews/index')
      .waitForElementVisible('body', 1000)
      .setValue('.aqs-project-input', ['en.nonexistent.org', browser.Keys.TAB])
      .pause(1000)
      .assert.containsText('.error-message', 'en.nonexistent.org')
      .assert.cssClassPresent('.select2-selection--multiple', 'disabled')
      .assert.elementNotPresent('canvas')
      .end();
  }
};

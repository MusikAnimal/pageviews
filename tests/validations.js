module.exports = {
  'Invalid project shows error and disables form': client => {
    client
      .url('http://localhost/pageviews/index')
      .waitForElementVisible('body', 1000);

    // apparently the only way to clear the value (clearValue does not work in FF)
    client.setValue('.aqs-project-input', [client.Keys.SHIFT, client.Keys.HOME, client.Keys.BACKSPACE])
      .setValue('.aqs-project-input', ['en.nonexistent.org', client.Keys.TAB])
      .pause(500)
      .assert.containsText('.error-message', 'en.nonexistent.org')
      .assert.cssClassPresent('.select2-selection--multiple', 'disabled')
      .assert.elementNotPresent('canvas')
      .end();
  }
};

module.exports = {
  'Invalid project shows error and disables form': client => {
    client
      .url('http://localhost/pageviews/index')
      .waitForElementVisible('body', 1000)
      .execute('return $(".aqs-project-input").val("")')
      .setValue('.aqs-project-input', ['en.nonexistent.org'])
      .execute('return $(".aqs-project-input").trigger("change")')
      .pause(500)
      .assert.containsText('.error-message', 'en.nonexistent.org')
      .assert.cssClassPresent('.select2-selection--multiple', 'disabled');
    client.expect.element('canvas').to.not.be.visible;
    client.end();
  }
};

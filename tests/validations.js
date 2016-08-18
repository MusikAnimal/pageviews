module.exports = {
  'Invalid project shows error and disables form': client => {
    client
      .url('http://localhost/pageviews/index?project=does.not.exist')
      .waitForElementVisible('body', 1000)
      .assert.containsText('.alert-danger', 'Invalid project');
    client.end();
  }
};

<?php require_once __DIR__ . '/../../config.php'; ?>
<?php $currentApp = 'redirectviews'; ?>
<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title><?php echo $I18N->msg( 'redirectviews-title' ); ?></title>
  </head>
  <body class="clearfix <?php echo $rtl; ?> <?php echo $currentApp; ?>">
    <?php include '../_header.php'; ?>
    <main class="col-lg-8 col-lg-offset-2">
      <!-- Site notice -->
      <div class="text-center site-notice-wrapper">
        <div class="site-notice">
          <?php include '../_browser_check.php'; ?>
        </div>
      </div>
      <form id="pv_form">
        <div class="row aqs-row options">
          <!-- Date range selector -->
          <div class="col-lg-3 col-sm-4">
            <label for="range-input">
              <?php echo $I18N->msg( 'dates' ); ?>
            </label>
            <input class="form-control date-range-selector" id="range-input">
          </div>
          <!-- Project selector -->
          <div class="col-lg-3 col-sm-3">
            <label for="project-input">
              <?php echo $I18N->msg( 'source-project' ); ?>
            </label>
            <input class="form-control" id="project-input" placeholder="en.wikipedia.org" required="required" spellcheck="false">
          </div>
          <!-- Advanced options -->
          <div class="col-lg-3 col-sm-3">
            <label for="platform-select">
              <?php echo $I18N->msg( 'platform' ); ?>
            </label>
            <select class="form-control" id="platform-select">
              <option value="all-access">
                <?php echo $I18N->msg( 'all' ); ?>
              </option>
              <option value="desktop">
                <?php echo $I18N->msg( 'desktop' ); ?>
              </option>
              <option value="mobile-app">
                <?php echo $I18N->msg( 'mobile-app' ); ?>
              </option>
              <option value="mobile-web">
                <?php echo $I18N->msg( 'mobile-web' ); ?>
              </option>
            </select>
          </div>
          <div class="col-lg-3 col-sm-2">
            <label for="agent-select">
              <?php echo $I18N->msg( 'agent' ); ?>
              <a class="help-link" href="/redirectviews/faq#agents">
                <span class="glyphicon glyphicon-question-sign"></span>
              </a>
            </label>
            <select class="form-control" id="agent-select">
              <option value="all-agents">
                <?php echo $I18N->msg( 'all' ); ?>
              </option>
              <option selected="selected" value="user">
                <?php echo $I18N->msg( 'user' ); ?>
              </option>
              <option value="spider">
                <?php echo $I18N->msg( 'spider' ); ?>
              </option>
            </select>
          </div>
        </div>
        <!-- Article URL input -->
        <div class="row aqs-row article-input-row">
          <div class="col-lg-12">
            <label for="source-input">
              <?php echo $I18N->msg( 'page' ); ?>
            </label>
            <div class="input-group">
              <input class="form-control input-control" id="source-input" placeholder="Star Wars" required="required" autocomplete="off">
              <span class="input-group-btn">
                <button class="btn btn-primary btn-submit pull-right">
                  <?php echo $I18N->msg( 'submit' ); ?>
                </button>
              </span>
            </div>
          </div>
        </div>
      </form>
      <?php
        $columns = array(
          'title' => 'page-title',
          'section' => 'section',
          'views' => 'pageviews'
        );
      ?>
      <?php include '../_output.php'; ?>
    </main>
    <?php include '../_footer.php'; ?>
    <?php include '../_modals.php'; ?>
  </body>
</html>

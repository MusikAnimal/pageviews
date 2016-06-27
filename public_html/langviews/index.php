<!-- Langviews Analysis tool -->
<!-- Copyright 2016 MusikAnimal -->
<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title><?php echo $I18N->msg( 'langviews-title' ); ?></title>
  </head>
  <body>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'langviews-title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'langviews-description' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <!-- Site notice -->
        <div class="text-center site-notice-wrapper">
          <div class="site-notice">
            <?php include "../_browser_check.php"; ?>
          </div>
        </div>
        <form id="pv_form">
          <div class="row aqs-row options">
            <!-- Date range selector -->
            <div class="col-lg-3 col-sm-4">
              <label for="range_input">
                <?php echo $I18N->msg( 'dates' ); ?>
              </label>
              <input class="form-control aqs-date-range-selector" id="range_input">
            </div>
            <!-- Project selector -->
            <div class="col-lg-3 col-sm-3">
              <label for="project_input">
                <?php echo $I18N->msg( 'source-project' ); ?>
              </label>
              <input class="form-control" id="project_input" placeholder="en.wikipedia.org" required="required">
            </div>
            <!-- Advanced options -->
            <div class="col-lg-3 col-sm-3">
              <label for="platform_select">
                <?php echo $I18N->msg( 'platform' ); ?>
              </label>
              <select class="form-control" id="platform_select">
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
              <label for="agent_select">
                <?php echo $I18N->msg( 'agent' ); ?>
                <a class="help-link" href="/langviews/faq#agents">
                  <span class="glyphicon glyphicon-question-sign"></span>
                </a>
              </label>
              <select class="form-control" id="agent_select">
                <option value="all-agents">
                  <?php echo $I18N->msg( 'all' ); ?>
                </option>
                <option selected="selected" value="user">
                  <?php echo $I18N->msg( 'user' ); ?>
                </option>
                <option value="spider">
                  <?php echo $I18N->msg( 'spider' ); ?>
                </option>
                <option value="bot">
                  <?php echo $I18N->msg( 'bot' ); ?>
                </option>
              </select>
            </div>
          </div>
          <!-- Article URL input -->
          <div class="row aqs-row article-input-row">
            <div class="col-lg-12">
              <label for="source_input">
                <?php echo $I18N->msg( 'page' ); ?>
              </label>
              <div class="input-group">
                <input class="form-control input-control" id="source_input" placeholder="Star Wars" required="required" autocomplete="off">
                <span class="input-group-btn">
                  <button class="btn btn-primary pull-right" id="article_submit">
                    <?php echo $I18N->msg( 'submit' ); ?>
                  </button>
                </span>
              </div>
            </div>
          </div>
        </form>
        <?php
          $columns = array(
            'lang' => 'language',
            'title' => 'page-title',
            'badges' => 'badges',
            'views' => 'pageviews'
          );
        ?>
        <?php include "../_output.php"; ?>
        <?php $currentApp = "langviews"; ?>
        <?php include "../_footer.php"; ?>
      </main>
      <?php include "../_modals.php"; ?>
    </div>
  </body>
</html>
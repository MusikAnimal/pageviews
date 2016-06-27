<!-- Pageviews Analysis tool -->
<!-- Copyright 2016 MusikAnimal -->
<!DOCTYPE html>
<html>
  <head>
    <?php include '_head.php'; ?>
    <title><?php echo $I18N->msg( 'title' ); ?></title>
  </head>
  <body class="<?php echo $rtl; ?>">
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'pageviews-description' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <!-- Site notice -->
        <div class="text-center site-notice-wrapper">
          <div class="site-notice">
            <?php include "_browser_check.php"; ?>
          </div>
        </div>
        <div class="row aqs-row options">
          <!-- Date range selector -->
          <div class="col-lg-5 col-sm-5">
            <label for="range-input">
              <?php echo $I18N->msg( 'dates' ); ?>
            </label>
            <span class="date-latest">
              <?php
                $days = array(10, 20, 30, 60, 90);
                $dayLinks = '';
                foreach ( $days as $day ) {
                  $dayLinks .= " <a data-value='{$day}' href='#'>{$day}</a>";
                }
              ?>
              <?php echo $I18N->msg( 'latest-days', array( 'variables' => array( $dayLinks ) ) ); ?>
            </span>
            <input class="form-control aqs-date-range-selector" id="range-input">
          </div>
          <!-- Project selector -->
          <div class="col-lg-3 col-sm-3">
            <label for="project-input">
              <?php echo $I18N->msg( 'project' ); ?>
            </label>
            <input class="form-control aqs-project-input" id="project-input" placeholder="en.wikipedia.org">
          </div>
          <!-- Advanced options -->
          <div class="col-lg-2 col-sm-2">
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
          <div class="col-lg-2 col-sm-2">
            <label for="agent-select">
              <?php echo $I18N->msg( 'agent' ); ?>
              <a class="help-link" href="/pageviews/faq#agents">
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
              <option value="bot">
                <?php echo $I18N->msg( 'bot' ); ?>
              </option>
            </select>
          </div>
        </div>
        <!-- Article selector -->
        <div class="row aqs-row">
          <div class="col-lg-12">
            <label for="article-input">
              <?php echo $I18N->msg( 'pages' ); ?>
            </label>
            <select class="aqs-select2-selector col-lg-12 invisible" id="article-input" multiple="multiple"></select>
          </div>
        </div>
        <?php include "_data_links.php"; ?>
        <!-- Chart -->
        <div class="chart-container">
          <canvas class="aqs-chart"></canvas>
        </div>
        <div class="message-container col-lg-12"></div>
        <!-- Legend -->
        <div class="col-lg-12 tm clearfix" id="chart-legend"></div>
        <?php $currentApp = "pageviews"; ?>
        <?php include "_footer.php"; ?>
      </main>
      <?php include "_modals.php"; ?>
    </div>
  </body>
</html>
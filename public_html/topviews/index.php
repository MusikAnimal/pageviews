<!-- Topviews Analysis tool -->
<!-- Copyright 2016 MusikAnimal -->
<?php $currentApp = "topviews"; ?>
<!DOCTYPE html>
<html>
  <head>
    <?php include "../_head.php"; ?>
    <title><?php echo $I18N->msg( 'topviews-title' ); ?></title>
  </head>
  <body class="<?php echo $rtl; ?> <?php echo $currentApp; ?>">
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'topviews-title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'topviews-description' ); ?>
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
        <div class="row aqs-row options">
          <!-- Date range selector -->
          <div class="col-lg-4 col-sm-4">
            <label for="range-input">
              <?php echo $I18N->msg( 'dates' ); ?>
            </label>
            <input class="form-control aqs-date-range-selector" id="range-input">
          </div>
          <!-- Project selector -->
          <div class="col-lg-4 col-sm-4">
            <label for="project-input">
              <?php echo $I18N->msg( 'project' ); ?>
            </label>
            <input class="form-control aqs-project-input" id="project-input" placeholder="en.wikipedia.org">
          </div>
          <div class="col-lg-4 col-sm-4">
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
        </div>
        <!-- Article selector -->
        <div class="row aqs-row">
          <div class="col-lg-12">
            <label for="article-input">
              <?php echo $I18N->msg( 'excluded-pages' ); ?>
            </label>
            <select class="aqs-select2-selector col-lg-12 invisible" id="article-input" multiple="multiple"></select>
          </div>
        </div>
        <!-- FIXME: use flexbox and not hacky per-project workaround to make input and data links stay on the same line -->
        <?php $cols = $I18N->getLang() === 'en' || $I18N->getLang() === 'de' ? 'col-lg-6' : 'col-lg-5'; ?>
        <span class="row search-topviews invisible <?php echo $cols; ?>">
          <div class="input-group">
            <label class="input-group-addon" for="topviews_search_field">
              <?php echo $I18N->msg( 'search' ); ?>
            </label>
            <span class="glyphicon glyphicon-search topviews-search-icon"></span>
            <input class="form-control" id="topviews_search_field">
          </div>
        </span>
        <span class="pull-right">
          <?php include "../_data_links.php"; ?>
        </span>
        <!-- Chart -->
        <div class="col-lg-12">
          <small class="text-muted">
            <?php echo $I18N->msg( 'topviews-data-approx' ); ?>
            <?php echo $I18N->msg( 'topviews-false-positive' ); ?>
          </small>
        </div>
        <div class="chart-container col-lg-12 loading"></div>
        <div class="col-lg-12 text-center">
          <a class="expand-chart" href="#">
            <?php echo $I18N->msg( 'show-more' ); ?>
          </a>
        </div>
        <div class="message-container col-lg-10"></div>
        <?php include "../_footer.php"; ?>
      </main>
      <?php include "../_modals.php"; ?>
    </div>
  </body>
</html>
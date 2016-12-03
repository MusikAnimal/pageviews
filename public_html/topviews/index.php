<!-- Topviews Analysis tool -->
<!-- Copyright 2016 MusikAnimal -->
<?php $currentApp = 'topviews'; ?>
<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title><?php echo $I18N->msg( 'topviews-title' ); ?></title>
  </head>
  <body class="clearfix <?php echo $rtl; ?> <?php echo $currentApp; ?>">
    <?php include '../_header.php'; ?>
    <main class="col-lg-8 col-lg-offset-2">
      <div class="text-center site-notice-wrapper">
        <div class="site-notice">
          <?php include '../_browser_check.php'; ?>
        </div>
      </div>
      <div class="row aqs-row options">
        <div class="col-lg-3 col-sm-3">
          <label for="date-type-select">
            <?php echo $I18N->msg( 'date-type' ); ?>
          </label>
          <select class="form-control" id="date-type-select">
            <option value="monthly">
              <?php echo $I18N->msg( 'monthly' ); ?>
            </option>
            <option value="daily">
              <?php echo $I18N->msg( 'daily' ); ?>
            </option>
          </select>
        </div>
        <div class="col-lg-3 col-sm-3">
          <label for="range-input">
            <?php echo $I18N->msg( 'date' ); ?>
          </label>
          <input class="form-control aqs-date-range-selector" id="range-input">
        </div>
        <div class="col-lg-3 col-sm-3">
          <label for="project-input">
            <?php echo $I18N->msg( 'project' ); ?>
          </label>
          <input class="form-control aqs-project-input" id="project-input" placeholder="en.wikipedia.org">
        </div>
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
      </div>
      <div class="row aqs-row">
        <div class="col-lg-12">
          <label for="article-input">
            <?php echo $I18N->msg( 'excluded-pages' ); ?>
          </label>
          <span class="pull-right">
            <label>
              <input class="mainspace-only-option" type="checkbox" checked="checked">
              <?php echo $I18N->msg( 'mainspace-only-option' ); ?>
            </label>
          </span>
          <select class="aqs-select2-selector col-lg-12 invisible" multiple="multiple"></select>
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
      <div class="col-lg-12 data-notice invisible">
        <small class="text-muted">
          <?php echo $I18N->msg( 'topviews-false-positive' ); ?>
        </small>
      </div>
      <div class="message-container col-lg-10"></div>
      <div class="chart-container col-lg-12 loading"></div>
      <div class="col-lg-12 text-center">
        <a class="expand-chart" href="#">
          <?php echo $I18N->msg( 'show-more' ); ?>
        </a>
      </div>
    </main>
    <?php include '../_footer.php'; ?>
    <?php include '../_modals.php'; ?>
  </body>
</html>

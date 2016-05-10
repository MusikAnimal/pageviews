<!-- Topviews Analysis tool -->
<!-- Copyright 2016 MusikAnimal -->
<!-- Redistributed under the MIT License: https://opensource.org/licenses/MIT -->
<!DOCTYPE html>
<html>
  <head>
    <?php include "../_head.php"; ?>
    <title><?php echo $I18N->msg( 'topviews-title' ); ?></title>
  </head>
  <body>
    <div class="container">
      <div class="col-lg-offset-2">
        <!-- Header -->
        <header class="row aqs-row">
          <div class="col-lg-10 text-center">
            <h4>
              <strong>
                <?php echo $I18N->msg( 'topviews-title' ); ?>
              </strong>
            </h4>
          </div>
        </header>
        <!-- Site notice -->
        <div class="col-lg-10 text-center site-notice-wrapper">
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
          <div class="col-lg-3 col-sm-4">
            <label for="project-input">
              <?php echo $I18N->msg( 'project' ); ?>
            </label>
            <input class="form-control aqs-project-input" id="project-input" placeholder="en.wikipedia.org">
          </div>
          <div class="col-lg-3 col-sm-4">
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
          <div class="col-lg-10">
            <label for="article-input">
              <?php echo $I18N->msg( 'excluded-pages' ); ?>
            </label>
            <select class="aqs-article-selector col-lg-12" id="article-input" multiple="multiple"></select>
          </div>
        </div>
        <!-- Chart -->
        <div class="col-lg-10">
          <small class="text-warning">
            <?php echo $I18N->msg( 'topviews-data-approx' ); ?>
            <?php echo $I18N->msg( 'topviews-false-positive' ); ?>
          </small>
        </div>
        <div class="chart-container col-lg-10"></div>
        <div class="col-lg-10 text-center">
          <a class="expand-chart" href="#">
            <?php echo $I18N->msg( 'show-more' ); ?>
          </a>
        </div>
        <div class="message-container col-lg-10"></div>
        <!-- Other links -->
        <div class="col-lg-10 data-links">
          <?php include "../_lang_selector.php"; ?>
        </div>
        <?php $currentApp = "topviews"; ?>
        <?php include "../_footer.php"; ?>
      </div>
    </div>
  </body>
</html>
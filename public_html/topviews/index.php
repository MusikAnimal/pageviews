<!-- Pageviews Comparison tool -->
<!-- Original code forked from https://gist.github.com/marcelrf/49738d14116fd547fe6d -->
<!-- courtesy of marcelrf -->
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
          <div class="site-notice"></div>
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
          <!-- .col-lg-3 -->
          <!-- %label{for: "platform-select"} Namespace -->
          <!-- %select#platform-select.form-control -->
          <!-- %option{value: "all"} All -->
          <!-- %option{value: "1"} Main -->
          <!-- %option{value: "2"} Mobile app -->
          <!-- %option{value: "3"} Mobile web -->
          <!-- Advanced options -->
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
        <div class="chart-container col-lg-10"></div>
        <div class="col-lg-10 text-center">
          <a class="expand-chart" href="#">
            <?php echo $I18N->msg( 'show-more' ); ?>
          </a>
        </div>
        <div class="message-container col-lg-10"></div>
        <!-- Other links -->
        <div class="col-lg-10 data-links">
          <hr>
          <!-- Download as -->
          <!-- %a.download-csv{href: "#"} CSV -->
          <!-- \&middot; -->
          <!-- %a.download-json{href: "#"} JSON -->
        </div>
        <?php $app = "topviews"; ?>
        <?php include "../_footer.php"; ?>
      </div>
    </div>
  </body>
</html>
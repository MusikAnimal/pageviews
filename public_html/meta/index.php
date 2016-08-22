<!-- Metaviews Analysis tool -->
<!-- Copyright 2016 MusikAnimal -->
<?php $currentApp = "metaviews"; ?>
<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title>Metaviews Analysis</title>
  </head>
  <body class="<?php echo $rtl; ?> <?php echo $currentApp; ?>">
    <div class="container">
      <header class="col-lg-10 col-lg-offset-1 text-center">
        <h4>
          <strong>
            Metaviews Analysis
          </strong>
          <small class="app-description">
            Pageviews Analysis of Pageviews Analysis
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
        </div>
        <!-- Tool selector -->
        <div class="row aqs-row">
          <div class="col-lg-12">
            <label for="tool-input">
              Tools
            </label>
            <select class="aqs-select2-selector col-lg-12 invisible" id="tool-input" multiple="multiple"></select>
          </div>
        </div>
        <?php include "../_data_links.php"; ?>
        <!-- Chart -->
        <div class="chart-container">
          <canvas class="aqs-chart"></canvas>
        </div>
        <div class="message-container col-lg-12"></div>
        <!-- Legend -->
        <div class="col-lg-12 tm clearfix" id="chart-legend"></div>
        <?php include "../_footer.php"; ?>
      </main>
      <?php include "../_modals.php"; ?>
    </div>
  </body>
</html>
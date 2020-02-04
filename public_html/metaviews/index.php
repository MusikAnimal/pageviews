<?php require_once __DIR__ . '/../../config.php'; ?>
<?php $currentApp = 'metaviews'; ?>
<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title>Metaviews Analysis</title>
  </head>
  <body class="clearfix <?php echo $rtl; ?> <?php echo $currentApp; ?>">
    <div class="text-center site-notice-wrapper">
      <div class="site-notice">
        <?php include '../_browser_check.php'; ?>
      </div>
    </div>
    <?php include '../_header.php'; ?>
    <main class="col-lg-8 col-lg-offset-2">
      <!-- Site notice -->
      <div class="text-center site-notice-wrapper">
        <div class="site-notice">
          <?php include '../_browser_check.php'; ?>
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
          <input class="form-control date-range-selector" id="range-input">
        </div>
      </div>
      <!-- Tool selector -->
      <div class="row aqs-row">
        <div class="col-lg-12">
          <label for="tool-input">
            Tools
          </label>
          <select class="col-lg-12 invisible" id="select2-input" multiple="multiple"></select>
        </div>
      </div>
      <?php include '../_data_links.php'; ?>
      <!-- Chart -->
      <div class="chart-container">
        <canvas id="chart"></canvas>
      </div>
      <div class="message-container col-lg-12"></div>
      <div class="output col-lg-10 col-lg-offset-1">
        <h4 class="single-page-stats text-center"></h4>
        <div class="single-page-legend hidden-lg col-md-4 col-md-offset-4 tm"></div>
        <table class="table table-hover table-view">
          <thead class="table-view--header">
            <tr>
              <th></th>
              <th class="table-view--title">
                <span class="sort-link sort-link--title" data-type="title">
                  Application
                  <span class="glyphicon glyphicon-sort"></span>
                </span>
              </th>
              <th class="table-view--pageloads">
                <span class="sort-link sort-link--pageloads" data-type="pageloads">
                  Page loads
                  <span class="glyphicon glyphicon-sort"></span>
                </span>
              </th>
              <th class="table-view--average">
                <span class="sort-link sort-link--average" data-type="average">
                  <?php echo $I18N->msg( 'daily-average' ); ?>
                  <span class="glyphicon glyphicon-sort"></span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="output-list"></tbody>
        </table>
      </div>
    </main>
    <div class="modal fade" id="project-list-modal" role="dialog" tabindex="-1">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <button class="close" arialabel="Close" data-dismiss="modal" type="button">
              <span aria-hidden="true">&times;</span>
            </button>
            <h4 class="modal-title"></h4>
          </div>
          <div class="modal-body">
            <table class="table table-hover">
              <thead class="project-table-view--header">
                <tr>
                  <th class="project-table-view--rank">Rank</th>
                  <th class="project-table-view--title">Project</th>
                  <th class="project-table-view--pageloads">Page loads</th>
                </tr>
              </thead>
              <tbody class="project-output-list"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <?php include '../_footer.php'; ?>
    <?php include '../_modals.php'; ?>
  </body>
</html>

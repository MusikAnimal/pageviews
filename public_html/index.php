<!--
 * Pageviews Comparison tool
 *
 * Original code forked from https://gist.github.com/marcelrf/49738d14116fd547fe6d
 * courtesy of marcelrf
 *
 * Copyright 2016 MusikAnimal
 * Redistributed under the MIT License: https://opensource.org/licenses/MIT
-->
<!DOCTYPE html>
<html>
  <head>
    <?php include '_head.php' ?>
    <title><?= $I18N->msg( 'title' ) ?></title>
  </head>
  <body>
    <div class='container'>
      <div class='col-lg-offset-2'>
        <!-- Header -->
        <header class='row aqs-row'>
          <div class='col-lg-10 text-center'>
            <h4>
              <strong>
                <?= $I18N->msg( 'title' ) ?>
              </strong>
            </h4>
          </div>
        </header>
        <!-- Site notice -->
        <div class='col-lg-10 text-center site-notice-wrapper'>
          <div class='site-notice'></div>
        </div>
        <div class='row aqs-row options'>
          <!-- Date range selector -->
          <div class='col-lg-4 col-sm-4'>
            <label for='range-input'><?= $I18N->msg( 'dates' ) ?></label>
            <span class='date-latest'>
              <?php
                $datelinks = "<a data-value='10' href='#'>10</a>"
                  . " <a data-value='20' href='#'>20</a>"
                  . " <a data-value='30' href='#'>30</a>"
                  . " <a data-value='60' href='#'>60</a>"
                  . " <a data-value='90' href='#'>90</a>";
                echo $I18N->msg( 'latest-days', array( 'variables' => array( $datelinks ) ) );
              ?>
            </span>
            <input class='form-control aqs-date-range-selector' id='range-input'>
          </div>
          <!-- Project selector -->
          <div class='col-lg-2 col-sm-3'>
            <label for='project-input'><?= $I18N->msg( 'project' ) ?></label>
            <input class='form-control aqs-project-input' id='project-input' placeholder='en.wikipedia.org'>
          </div>
          <!-- Advanced options -->
          <div class='col-lg-2 col-sm-3'>
            <label for='platform-select'><?= $I18N->msg( 'platform' ) ?></label>
            <select class='form-control' id='platform-select'>
              <option value='all-access'><?= $I18N->msg( 'all' ) ?></option>
              <option value='desktop'><?= $I18N->msg( 'desktop' ) ?></option>
              <option value='mobile-app'><?= $I18N->msg( 'mobile-app' ) ?></option>
              <option value='mobile-web'><?= $I18N->msg( 'mobile-web' ) ?></option>
            </select>
          </div>
          <div class='col-lg-2 col-sm-2'>
            <label for='agent-select'><?= $I18N->msg( 'agent' ) ?></label>
            <select class='form-control' id='agent-select'>
              <option value='all-agents'><?= $I18N->msg( 'all' ) ?></option>
              <option selected='selected' value='user'><?= $I18N->msg( 'user' ) ?></option>
              <option value='spider'><?= $I18N->msg( 'spider' ) ?></option>
              <option value='bot'><?= $I18N->msg( 'bot' ) ?></option>
            </select>
          </div>
        </div>
        <!-- Article selector -->
        <div class='row aqs-row'>
          <div class='col-lg-10'>
            <label for='article-input'><?= $I18N->msg( 'pages' ) ?></label>
            <!-- Button trigger modal -->
            <!-- %a.pull-right{href: "#", "data-toggle": "modal", "data-target": "#import-modal"} -->
            <!-- Import -->
            <select class='aqs-article-selector col-lg-12' id='article-input' multiple='multiple'></select>
          </div>
        </div>
        <!-- Chart -->
        <div class='chart-container col-lg-10 loading'>
          <!-- inline styles since the ad blocker might block loading of assets -->
          <div class='ad-block-notice text-center'>
            <?php
              $url = "<span style='font-family: Consolas, Lucida Console, monospace;'>/pageviews/*</span>";
              echo $I18N->msg( 'chart-error', array( 'variables' => array( $url ) ) );
            ?>
          </div>
          <canvas class='aqs-chart'></canvas>
        </div>
        <div class='message-container col-lg-10'></div>
        <!-- Legend -->
        <div class='col-lg-10' id='chart-legend'></div>
        <!-- Other links -->
        <div class='col-lg-10 data-links'>
          <a data-target='#chart-type-modal' data-toggle='modal' href='#'><?= $I18N->msg( 'change-chart' ) ?></a>
          &bullet;
          <a data-target='#settings-modal' data-toggle='modal' href='#'><?= $I18N->msg( 'settings' ) ?></a>
          &bullet;
          <?php
            $csvlink = "<a class='download-csv' href='#'>" . $I18N->msg( 'csv' ) . "</a>";
            echo $I18N->msg( 'download', array( 'variables' => array( $csvlink ) ) );
          ?>
          &middot;
          <a class='download-json' href='#'><?= $I18N->msg( 'json' ) ?></a>
        </div>
        <?php
          $app = "pageviews";
          include "_footer.php";
        ?>
      </div>
      <?php include "_modals.php"; ?>
    </div>
  </body>
</html>

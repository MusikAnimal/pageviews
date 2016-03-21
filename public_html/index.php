<!-- Pageviews Analysis tool -->
<!-- Original code forked from https://gist.github.com/marcelrf/49738d14116fd547fe6d -->
<!-- courtesy of marcelrf -->
<!-- Copyright 2016 MusikAnimal -->
<!-- Redistributed under the MIT License: https://opensource.org/licenses/MIT -->
<!DOCTYPE html>
<html>
  <head>
    <?php include '_head.php'; ?>
    <title><?php echo $I18N->msg( 'title' ); ?></title>
  </head>
  <body>
    <div class="container">
      <div class="col-lg-offset-2">
        <!-- Header -->
        <header class="row aqs-row">
          <div class="col-lg-10 text-center">
            <h4>
              <strong>
                <?php echo $I18N->msg( 'title' ); ?>
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
          <div class="col-lg-2 col-sm-3">
            <label for="project-input">
              <?php echo $I18N->msg( 'project' ); ?>
            </label>
            <input class="form-control aqs-project-input" id="project-input" placeholder="en.wikipedia.org">
          </div>
          <!-- Advanced options -->
          <div class="col-lg-2 col-sm-3">
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
          <div class="col-lg-10">
            <label for="article-input">
              <?php echo $I18N->msg( 'pages' ); ?>
            </label>
            <!-- Button trigger modal -->
            <!-- %a.pull-right{href: "#", "data-toggle": "modal", "data-target": "#import-modal"} -->
            <!-- Import -->
            <select class="aqs-article-selector col-lg-12" id="article-input" multiple="multiple"></select>
          </div>
        </div>
        <!-- Chart -->
        <div class="chart-container col-lg-10 loading">
          <!-- inline styles since the ad blocker might block loading of assets -->
          <div class="ad-block-notice text-center">
            <?php $url = "<span style='font-family: Consolas, Lucida Console, monospace;'>/pageviews/*</span>"; ?>
            <?php echo $I18N->msg( 'chart-error', array( 'variables' => array( $url ) ) ); ?>
          </div>
          <canvas class="aqs-chart"></canvas>
        </div>
        <div class="message-container col-lg-10"></div>
        <!-- Legend -->
        <div class="col-lg-10" id="chart-legend"></div>
        <!-- Other links -->
        <div class="col-lg-10 data-links">
          <a class="js-test-change-chart" data-target="#chart-type-modal" data-toggle="modal" href="#">
            <?php echo $I18N->msg( 'change-chart' ); ?>
          </a>
          &bullet;
          <a class="js-test-settings" data-target="#settings-modal" data-toggle="modal" href="#">
            <?php echo $I18N->msg( 'settings' ); ?>
          </a>
          &bullet;
          <?php $csvlink = "<a class='download-csv' href='#'>" . $I18N->msg( 'csv' ) . "</a>"; ?>
          <?php echo $I18N->msg( 'download', array( 'variables' => array( $csvlink ) ) ); ?>
          &middot;
          <a class="download-json" href="#">
            <?php echo $I18N->msg( 'json' ); ?>
          </a>
          <!-- Language selector -->
          <span class="btn-group dropup lang-group pull-right">
            <button class="btn btn-default btn-sm dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              <?php echo $currentLang; ?>
              <span class="caret"></span>
            </button>
            <ul class="dropdown-menu">
              <li>
                <a href="https://translatewiki.net/w/i.php?title=Special:MessageGroupStats&group=out-pageviews">
                  <?php echo $I18N->msg( 'help-translate' ); ?>
                </a>
              </li>
              <li class="divider" role="separator"></li>
              <?php foreach (array_unique($langs) as $lang => $langName) { ?>
                <li>
                  <a class="lang-link" href="#" data-lang="<?php echo $lang; ?>"><?php echo $langName; ?></a>
                </li>
              <?php } ?>
            </ul>
          </span>
        </div>
        <?php $app = "pageviews"; ?>
        <?php include "_footer.php"; ?>
      </div>
      <?php include "_modals.php"; ?>
    </div>
  </body>
</html>
<!-- Pageviews Comparison tool -->
<!-- Original code forked from https://gist.github.com/marcelrf/49738d14116fd547fe6d courtesy of marcelrf -->
<!-- Copyright 2016 MusikAnimal -->
<!-- Redistributed under the MIT License: https://opensource.org/licenses/MIT -->
<!DOCTYPE html>
<html>
  <head>
    <?php include '_head.php' ?>
    <title>Pageviews Analysis</title>
  </head>
  <body>
    <div class='container'>
      <div class='col-lg-offset-2'>
        <!-- Header -->
        <header class='row aqs-row'>
          <div class='col-lg-10 text-center'>
            <h4>
              <strong>
                Pageviews Analysis
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
            <label for='range-input'>Dates</label>
            <span class='date-latest'>
              Latest
              <a data-value='10' href='#'>10</a>
              <a data-value='20' href='#'>20</a>
              <a data-value='30' href='#'>30</a>
              <a data-value='60' href='#'>60</a>
              <a data-value='90' href='#'>90</a>
              days
            </span>
            <input class='form-control aqs-date-range-selector' id='range-input'>
          </div>
          <!-- Project selector -->
          <div class='col-lg-2 col-sm-3'>
            <label for='project-input'>Project</label>
            <input class='form-control aqs-project-input' id='project-input' placeholder='en.wikipedia.org'>
          </div>
          <!-- Advanced options -->
          <div class='col-lg-2 col-sm-3'>
            <label for='platform-select'>Platform</label>
            <select class='form-control' id='platform-select'>
              <option value='all-access'>All</option>
              <option value='desktop'>Desktop</option>
              <option value='mobile-app'>Mobile app</option>
              <option value='mobile-web'>Mobile web</option>
            </select>
          </div>
          <div class='col-lg-2 col-sm-2'>
            <label for='agent-select'>Agent</label>
            <select class='form-control' id='agent-select'>
              <option value='all-agents'>All</option>
              <option selected='selected' value='user'>User</option>
              <option value='spider'>Spider</option>
              <option value='bot'>Bot</option>
            </select>
          </div>
        </div>
        <!-- Article selector -->
        <div class='row aqs-row'>
          <div class='col-lg-10'>
            <label for='article-input'>Pages</label>
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
            Chart not appearing? Please ensure you have all ad blockers disabled or have
            <span style="font-family: Consolas, Lucida Console, monospace;">/pageviews/*</span>
            whitelisted.
          </div>
          <canvas class='aqs-chart'></canvas>
        </div>
        <div class='message-container col-lg-10'></div>
        <!-- Legend -->
        <div class='col-lg-10' id='chart-legend'></div>
        <!-- Other links -->
        <div class='col-lg-10 data-links'>
          <a data-target='#chart-type-modal' data-toggle='modal' href='#'>Change chart type</a>
          &bullet;
          <a data-target='#settings-modal' data-toggle='modal' href='#'>Settings</a>
          &bullet;
          Download as
          <a class='download-csv' href='#'>CSV</a>
          &middot;
          <a class='download-json' href='#'>JSON</a>
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

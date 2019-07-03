<!-- Toolviews -->
<!-- Copyright 2016-2019 MusikAnimal -->
<?php require_once __DIR__ . '/../../config.php'; ?>
<?php $currentApp = 'toolviews'; ?>
<!DOCTYPE html>
<html>
  <head>
    <meta content="yes" name="apple-mobile-web-app-capable">
    <meta content="black-translucent" name="apple-mobile-web-app-status-bar-style">
    <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" name="viewport">
    <link rel="shortcut icon" sizes="16x16 32x32 48x48 96x96" href="images/favicon.ico?v=3">
    <script src="/toolviews/application.js"></script>
    <link href="/toolviews/application.css" rel="stylesheet">
    <title>Toolviews</title>
  </head>
  <body class="clearfix toolviews">
    <header class="site-header">
      <h4 class="text-center">
        <strong>Toolviews</strong>
        <small class="app-description">Pageviews to Toolforge tools</small>
      </h4>
    </header>
    <main class="col-lg-8 col-lg-offset-2">
      <div class="form-wrapper">
        <div class="row aqs-row options">
          <div class="col-lg-3 col-sm-3">
            <label for="range-input">
              Date
            </label>
            <input class="form-control aqs-date-range-selector" id="range-input">
          </div>
        </div>
      </div>
      <div class="message-container col-lg-10"></div>
      <div class="chart-container col-lg-12">
        <table class="table output-table">
          <thead>
            <tr class="toolview-entry">
              <th>Rank</th>
              <th>Tool</th>
              <th>Views</th>
            </tr>
          </thead>
          <tbody class="toolview-entries"></tbody>
        </table>
      </div>
      <div class="col-lg-12 text-center">
        <a class="show-more" href="#">
          Show more
        </a>
      </div>
    </main>
    <div class="spacer"></div>
    <footer>
      <hr>
      <span>
        <?php $MusikAnimal = "<a href='https://en.wikipedia.org/wiki/User:MusikAnimal'>MusikAnimal</a>"; ?>
        <?php $CloudServices = "<a href='https://www.mediawiki.org/wiki/Wikimedia_Cloud_Services_team'>Wikimedia Cloud Services</a>"; ?>
        <?php $contributors = "contributors"; ?>
        Brought to you by the <?php echo $CloudServices; ?> team, <?php echo $MusikAnimal; ?> and <?php echo $contributors; ?>.
      </span>
      <div>
        <span class="nowrap">
          <?php $heart = "<span class='heart'>&hearts;</span>"; ?>
          <?php $host = "<a href='https://wikitech.wikimedia.org/wiki/Portal:Toolforge'>Toolforge</a>"; ?>
          Hosted with <?php echo $heart; ?> on <?php echo $host; ?> &middot;
          <a href="https://github.com/MusikAnimal/pageviews">View source</a>
        </span>
      </div>
    </footer>
  </body>
</html>

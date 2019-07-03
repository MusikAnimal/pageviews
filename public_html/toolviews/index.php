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
    <script src="<?php echo BASE_PATH; ?>/toolviews/application.js"></script>
    <link href="<?php echo BASE_PATH; ?>/toolviews/application.css" rel="stylesheet">
    <title>Toolviews</title>
  </head>
  <body class="clearfix toolviews">
    <header class="site-header">
      <h4 class="text-center">
        <strong>Toolviews</strong>
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
  </body>
</html>

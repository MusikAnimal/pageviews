<?php require_once __DIR__ . '/../../config.php'; ?>
<?php $currentApp = 'pageviews'; ?>
<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title><?php echo $I18N->msg( 'title' ); ?></title>
  </head>
  <body class="<?php echo $rtl; ?> <?php echo $currentApp; ?> initial">
    <div class="text-center site-notice-wrapper">
      <div class="site-notice">
        <?php include '../_browser_check.php'; ?>
      </div>
    </div>
    <?php include '../_header.php'; ?>
    <aside class="col-lg-2 col-md-2 page-selector">
      <header class="text-center">
        <h4>
          <?php echo $I18N->msg( 'options' ); ?>
        </h4>
      </header>
      <div class="page-selector--container">
        <div class="date-selector">
          <label for="range-input">
            <?php echo $I18N->msg( 'dates' ); ?>
          </label>
          <div class="btn-group dropdown latest-group">
            <button class="btn btn-default btn-xs dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              <span class="latest-text">
                <?php echo $I18N->msg( 'latest' ); ?>
              </span>
              <span class="caret"></span>
            </button>
            <ul class="dropdown-menu dropdown-menu-right date-latest">
              <?php foreach ([10, 20, 30, 60, 90] as $offset) { ?>
                <li>
                  <a href="#" data-value="<?php echo $offset; ?>"><?php echo $offset; ?></a>
                </li>
              <?php } ?>
            </ul>
          </div>
          <input class="form-control date-range-selector" id="range-input">
        </div>
        <div class="month-selector input-daterange clearfix">
          <label for="month-start">
            <?php echo $I18N->msg( 'dates' ); ?>
          </label>
          <div>
            <input class="form-control input-control month-selector-start pull-left" id="month-start" readonly="readonly">
            <input class="form-control input-control month-selector-end pull-left" id="month-end" readonly="readonly">
          </div>
        </div>
        <div>
          <label for="date-type-select">
            <?php echo $I18N->msg( 'date-type' ); ?>
          </label>
          <select class="form-control" id="date-type-select">
            <option value="daily">
              <?php echo $I18N->msg( 'daily' ); ?>
            </option>
            <option value="monthly">
              <?php echo $I18N->msg( 'monthly' ); ?>
            </option>
          </select>
        </div>
        <div>
          <label for="project-input">
            <?php echo $I18N->msg( 'project' ); ?>
          </label>
          <input class="form-control aqs-project-input" id="project-input" placeholder="en.wikipedia.org" spellcheck="false">
        </div>
        <div>
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
        <div>
          <label for="agent-select">
            <?php echo $I18N->msg( 'agent' ); ?>
            <a class="help-link" href="/pageviews/faq#agents">
              <span class="glyphicon glyphicon-question-sign"></span>
            </a>
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
          </select>
        </div>
      </div>
    </aside>
    <main class="col-lg-8 col-md-10">
      <div>
        <label for="article-input">
          <?php echo $I18N->msg( 'pages' ); ?>
          <small class="text-muted num-entities-info">
            <?php echo $I18N->msg( 'num-pages-info', [ 'variables' => [ 10 ] ] ); ?>
          </small>
        </label>
        <span class="clear-pages pull-right">
          &#x2715;
          <?php echo $I18N->msg( 'clear' ); ?>
        </span>
        <select class="aqs-select2-selector col-lg-12 invisible" id="article-input" multiple="multiple"></select>
      </div>
      <?php include '../_data_links.php'; ?>
      <!-- Chart -->
      <div class="chart-container">
        <canvas id="chart"></canvas>
      </div>
      <div class="message-container col-lg-12"></div>
    </main>
    <aside class="col-lg-2 visible-lg-block summary-column">
      <header class="text-center">
        <h4>
          <?php echo $I18N->msg( 'totals' ); ?>
        </h4>
      </header>
      <div class="summary-column--container">
        <div class="chart-legend col-lg-12 clearfix"></div>
      </div>
    </aside>
    <div class="output col-lg-10 col-lg-offset-1">
      <h4 class="single-page-stats text-center"></h4>
      <h5 class="single-page-ranking text-center"></h5>
      <div class="single-page-legend hidden-lg col-md-4 col-md-offset-4 tm"></div>
      <?php
        $columns = array(
          'title' => 'page-title',
          'class' => 'class',
          'views' => 'views',
          'average' => 'daily-average',
          'edits' => 'edits',
          'editors' => 'editors',
          'size' => 'size',
          'protection' => 'protection',
          'watchers' => 'watchers'
        );
      ?>
      <div class="table-view--wrapper">
        <table class="table table-hover table-view">
          <thead class="table-view--header">
            <tr>
              <th></th>
              <?php foreach( $columns as $column => $translation ) { ?>
                <th class="table-view--<?php echo $column; ?>">
                  <span class="sort-link sort-link--<?php echo $column; ?>" data-type="<?php echo $column; ?>">
                    <span class="col-heading">
                      <?php echo $I18N->msg( $translation ); ?>
                    </span>
                    <span class="glyphicon glyphicon-sort"></span>
                  </span>
                </th>
              <?php } ?>
              <th>
                <span>
                  <?php echo $I18N->msg( 'links' ); ?>
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="output-list"></tbody>
        </table>
      </div>
    </div>
    <?php include '../_footer.php'; ?>
    <?php include '../_modals.php'; ?>
  </body>
</html>

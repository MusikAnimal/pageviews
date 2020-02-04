<?php require_once __DIR__ . '/../../config.php'; ?>
<?php $currentApp = 'topviews'; ?>
<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title><?php echo $I18N->msg( 'topviews-title' ); ?></title>
  </head>
  <body class="clearfix <?php echo $rtl; ?> <?php echo $currentApp; ?>">
    <?php include '../_header.php'; ?>
    <main class="col-lg-8 col-lg-offset-2">
      <div class="text-center site-notice-wrapper">
        <div class="site-notice">
          <?php include '../_browser_check.php'; ?>
        </div>
      </div>
      <div class="form-wrapper">
        <div class="row aqs-row options">
          <div class="col-lg-3 col-sm-3">
            <label for="date-type-select">
              <?php echo $I18N->msg( 'date-type' ); ?>
            </label>
            <select class="form-control" id="date-type-select">
              <option value="monthly">
                <?php echo $I18N->msg( 'monthly' ); ?>
              </option>
              <option value="daily">
                <?php echo $I18N->msg( 'daily' ); ?>
              </option>
              <option value="yearly">
                <?php echo $I18N->msg( 'yearly' ); ?>
              </option>
            </select>
          </div>
          <div class="col-lg-3 col-sm-3">
            <label for="date-input">
              <?php echo $I18N->msg( 'date' ); ?>
            </label>
            <input class="form-control date-selector" id="date-input">
          </div>
          <div class="col-lg-3 col-sm-3">
            <label for="project-input">
              <?php echo $I18N->msg( 'project' ); ?>
            </label>
            <input class="form-control aqs-project-input" id="project-input" placeholder="en.wikipedia.org" spellcheck="false">
          </div>
          <div class="col-lg-3 col-sm-3">
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
        <div class="row">
          <div class="col-lg-12 topviews-toggles">
            <label>
              <?php echo $I18N->msg( 'excluded-pages' ); ?>
            </label>
            <span class="report-false-positive">
              (<a href='#' data-target="#report-false-positive-modal" data-toggle="modal"><?php echo strtolower( $I18N->msg( 'report-false-positive' ) ); ?></a>)
            </span>
            <span class="pull-right">
              <label>
                <input class="mainspace-only-option" type="checkbox" checked="checked">
                <?php echo $I18N->msg( 'mainspace-only-option' ); ?>
              </label>
            </span>
            <span class="pull-right percent-mobile-wrapper">
              <label>
                <input class="show-percent-mobile" type="checkbox">
                <?php echo $I18N->msg( 'show-mobile-percentages' ); ?>
              </label>
            </span>
            <select class="col-lg-12" id="select2-input" multiple="multiple"></select>
            <!-- * Report false positive modal */ -->
            <div class="modal fade" id="report-false-positive-modal" role="dialog" tabindex="-1">
              <div class="modal-dialog" role="document">
                <div class="modal-content">
                  <div class="modal-header">
                    <button class="close" aria-label="Close" data-dismiss="modal" type="button">
                      <span aria-hidden="true">&times;</span>
                    </button>
                    <h4 class="modal-title">
                      <?php echo $I18N->msg( 'report-false-positive' ); ?>
                    </h4>
                  </div>
                  <div class="modal-body">
                    <p>
                      <?php $learnMoreLink = "<a href='/topviews/faq#false_positive'>" . strtolower( $I18N->msg( 'learn-more' ) ) . "</a>"; ?>
                      <?php echo $I18N->msg( 'report-false-positive-text', [ 'variables' => [ $learnMoreLink ] ] ); ?>
                    </p>
                    <ul class="false-positive-list list-unstyled"></ul>
                  </div>
                  <div class="modal-footer">
                    <button class="btn btn-default" data-dismiss="modal" type="button">
                      <?php echo $I18N->msg( 'cancel' ); ?>
                    </button>
                    <button class="btn btn-primary submit-false-positive" data-dismiss="modal" type="button">
                      <?php echo $I18N->msg( 'submit' ); ?>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <!-- * List false positives modal */ -->
            <div class="modal fade" id="list-false-positives-modal" role="dialog" tabindex="-1">
              <div class="modal-dialog" role="document">
                <div class="modal-content">
                  <div class="modal-header">
                    <button class="close" aria-label="Close" data-dismiss="modal" type="button">
                      <span aria-hidden="true">&times;</span>
                    </button>
                    <h4 class="modal-title">
                      <?php echo $I18N->msg( 'list-false-positives-heading' ); ?>
                    </h4>
                  </div>
                  <div class="modal-body">
                    <p>
                      <?php $learnMoreLink = "<a href='/topviews/faq#false_positive'>" . strtolower( $I18N->msg( 'learn-more' ) ) . "</a>"; ?>
                      <?php echo $I18N->msg( 'list-false-positives-text', [ 'variables' => [ $learnMoreLink ] ] ); ?>
                    </p>
                    <table class="table table-bordered">
                      <thead>
                        <tr>
                          <th><?php echo $I18N->msg( 'page' ); ?></th>
                          <th><?php echo $I18N->msg( 'original-rank' ); ?></th>
                        </tr>
                      </thead>
                      <tbody class="false-positive-list"></tbody>
                    </table>
                  </div>
                  <div class="modal-footer">
                    <button class="btn btn-primary" data-dismiss="modal" type="button">
                      <?php echo $I18N->msg( 'ok' ); ?>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- FIXME: use flexbox and not hacky per-project workaround to make input and data links stay on the same line -->
        <?php $cols = $I18N->getLang() === 'en' || $I18N->getLang() === 'de' ? 'col-lg-6' : 'col-lg-5'; ?>
        <div class="row search-topviews <?php echo $cols; ?>">
          <div class="input-group">
            <label class="input-group-addon" for="topviews_search_field">
              <?php echo $I18N->msg( 'search' ); ?>
            </label>
            <span class="glyphicon glyphicon-search topviews-search-icon"></span>
            <input class="form-control" id="topviews_search_field">
          </div>
        </div>
        <div class="pull-right">
          <?php include "../_data_links.php"; ?>
        </div>
        <div class="data-notice">
          <small class="text-muted">
            <?php echo $I18N->msg( 'topviews-false-positive' ); ?>
            <span class="list-false-positives"></span>
          </small>
        </div>
      </div>
      <div class="message-container col-lg-10"></div>
      <div class="chart-container col-lg-12">
        <table class="table output-table">
          <thead>
            <tr class="topview-entry">
              <th><?php echo $I18N->msg( 'rank' ); ?></th>
              <th><?php echo $I18N->msg( 'page' ); ?></th>
              <th class="topview-entry--edits"><?php echo $I18N->msg( 'edits' ); ?></th>
              <th class="topview-entry--editors"><?php echo $I18N->msg( 'editors' ); ?></th>
              <th><?php echo $I18N->msg( 'pageviews' ); ?></th>
              <th class="topview-entry--mobile"><?php echo $I18N->msg( 'percent-mobile' ); ?></th>
            </tr>
          </thead>
          <tbody class="topview-entries"></tbody>
        </table>
      </div>
      <div class="col-lg-12 text-center">
        <a class="show-more" href="#">
          <?php echo $I18N->msg( 'show-more' ); ?>
        </a>
      </div>
    </main>
    <?php include '../_footer.php'; ?>
    <?php include '../_modals.php'; ?>
  </body>
</html>

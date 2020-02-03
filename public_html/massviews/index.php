<?php require_once __DIR__ . '/../../config.php'; ?>
<?php $currentApp = 'massviews'; ?>
<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title><?php echo $I18N->msg( 'massviews-title' ); ?></title>
  </head>
  <body class="clearfix <?php echo $rtl; ?> <?php echo $currentApp; ?>">
    <?php include '../_header.php'; ?>
    <main class="col-lg-8 col-lg-offset-2">
      <!-- Site notice -->
      <div class="text-center site-notice-wrapper">
        <div class="site-notice">
          <?php include '../_browser_check.php'; ?>
        </div>
      </div>
      <form id="pv_form">
        <div class="row aqs-row options">
          <!-- Date range selector -->
          <div class="col-lg-4 col-sm-4">
            <label for="range_input">
              <?php echo $I18N->msg( 'dates' ); ?>
            </label>
            <input class="form-control date-range-selector" id="range_input">
          </div>
          <!-- Advanced options -->
          <div class="col-lg-4 col-sm-4">
            <label for="platform_select">
              <?php echo $I18N->msg( 'platform' ); ?>
            </label>
            <select class="form-control" id="platform_select">
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
          <div class="col-lg-4 col-sm-4">
            <label for="agent_select">
              <?php echo $I18N->msg( 'agent' ); ?>
              <a class="help-link" href="/massviews/faq#agents">
                <span class="glyphicon glyphicon-question-sign"></span>
              </a>
            </label>
            <select class="form-control" id="agent_select">
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
        <!-- Source input -->
        <div class="row aqs-row massviews-source-input">
          <div class="col-lg-12">
            <label for="source_input">
              <?php echo $I18N->msg( 'source' ); ?>
              <a class="help-link" href="/massviews/faq#sources">
                <span class="glyphicon glyphicon-question-sign"></span>
              </a>
            </label>
            <div class="category-options">
              <div class="checkbox pull-right category-subject-toggle">
                <label>
                  <input class="category-subject-toggle--input" type="checkbox">
                  <?php echo $I18N->msg( 'category-subject-toggle' ); ?>
                  <a class="help-link" href="/massviews/faq#category_subject_toggle">
                    <span class="glyphicon glyphicon-question-sign"></span>
                  </a>
                </label>
              </div>
              <div class="checkbox pull-right subcategories-toggle">
                <label>
                  <input class="subcategories-toggle--input" type="checkbox">
                  <?php echo $I18N->msg( 'include-subcategories' ); ?>
                </label>
              </div>
            </div>
            <div class="input-group clearfix">
              <div class="input-group-btn">
                <button class="btn btn-default dropdown-toggle" id="source_button" type="button" data-value="category" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  <?php echo $I18N->msg( 'category' ); ?>
                  <span class="caret"></span>
                </button>
                <ul class="dropdown-menu">
                  <li>
                    <a class="source-option" href="#" data-value="category">
                      <?php echo $I18N->msg( 'category' ); ?>
                    </a>
                  </li>
                  <li>
                    <a class="source-option" href="#" data-value="wikilinks">
                      <?php echo $I18N->msg( 'wikilinks' ); ?>
                    </a>
                  </li>
                  <li>
                    <a class="source-option" href="#" data-value="pagepile">
                      Page Pile
                    </a>
                  </li>
                  <li>
                    <a class="source-option" href="#" data-value="subpages">
                      <?php echo $I18N->msg( 'subpages' ); ?>
                    </a>
                  </li>
                  <li>
                    <a class="source-option" href="#" data-value="transclusions">
                      <?php echo $I18N->msg( 'transclusions' ); ?>
                    </a>
                  </li>
                  <li>
                    <a class="source-option" href="#" data-value="external-link">
                      <?php echo $I18N->msg( 'external-link' ); ?>
                    </a>
                  </li>
                  <li>
                    <a class="source-option" href="#" data-value="hashtag">
                      <?php echo $I18N->msg( 'hashtag' ); ?>
                    </a>
                  </li>
                  <li>
                    <a class="source-option" href="#" data-value="quarry">
                      Quarry
                    </a>
                  </li>
                  <li>
                    <a class="source-option" href="#" data-value="search">
                      <?php echo $I18N->msg( 'search' ); ?>
                    </a>
                  </li>
                </ul>
              </div>
              <input class="form-control input-control source-input" id="source_input" required="required">
              <input class="form-control input-control project-input col-lg-6" required="required" placeholder="en.wikipedia.org" spellcheck="false" disabled="disabled">
              <span class="input-group-btn">
                <button class="btn btn-primary pull-right btn-submit">
                  <?php echo $I18N->msg( 'submit' ); ?>
                </button>
              </span>
            </div>
            <div class="source-description text-muted"></div>
          </div>
        </div>
      </form>
      <?php
        $columns = array(
          'title' => 'page-title',
          'views' => 'pageviews'
        );
      ?>
      <?php include '../_output.php'; ?>
    </main>
    <?php include '../_footer.php'; ?>
    <?php include '../_modals.php'; ?>
  </body>
</html>

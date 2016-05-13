<!-- Massviews Analysis tool -->
<!-- Copyright 2016 MusikAnimal -->
<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title><?php echo $I18N->msg( 'massviews-title' ); ?></title>
  </head>
  <body>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'massviews-title' ); ?>
          </strong>
          <small class="app-description">
            Import a list of pages and analyze the pageviews
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
        <form id="massviews_form">
          <div class="row aqs-row options">
            <!-- Date range selector -->
            <div class="col-lg-4 col-sm-4">
              <label for="range_input">
                <?php echo $I18N->msg( 'dates' ); ?>
              </label>
              <input class="form-control aqs-date-range-selector" id="range_input">
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
                <option value="bot">
                  <?php echo $I18N->msg( 'bot' ); ?>
                </option>
              </select>
            </div>
          </div>
          <!-- Page Pile input -->
          <div class="row aqs-row">
            <div class="col-lg-12">
              <label for="source_input">
                Page Pile ID
              </label>
              <div class="input-group">
                <!-- FIXME: this is temporary, should be using the button -->
                <input id="source_button" type="hidden" data-value="pagepile">
                <!-- %div.input-group-btn -->
                <!-- %button.btn.btn-default.dropdown-toggle#source_button(data-value="pagepile" data-toggle="dropdown" aria-haspopup="true" aria-expand="false") -->
                <!-- Page Pile ID -->
                <!-- %span.caret -->
                <!-- %ul.dropdown-menu -->
                <!-- %li -->
                <!-- %a(href="#") Page Pile ID -->
                <!-- %li -->
                <!-- %a(href="#") Category URL -->
                <input class="form-control input-control source-input" id="source_input" type="number" min="0" placeholder="12345" required="required" autocomplete="off">
                <span class="input-group-btn">
                  <button class="btn btn-primary pull-right">
                    <?php echo $I18N->msg( 'submit' ); ?>
                  </button>
                </span>
              </div>
            </div>
          </div>
        </form>
        <div class="col-lg-5 col-sm-8 center-block progress-bar--wrapper">
          <div class="progress">
            <div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" style="width: 0%"></div>
          </div>
        </div>
        <output form="massview_form">
          <header class="output-header">
            <strong class="another-query">
              <span class="glyphicon glyphicon-chevron-left"></span>
              <?php echo $I18N->msg( 'another-query' ); ?>
            </strong>
            <h2 class="tm">
              <a class="massviews-input-name" target="_blank"></a>
              <small class="massviews-params"></small>
            </h2>
          </header>
          <table class="table table-hover output-table">
            <thead>
              <tr>
                <th>#</th>
                <th>
                  <span class="sort-link sort-link--title" data-type="<?php echo 'title'; ?>">
                    <?php echo $I18N->msg( 'page-title' ); ?>
                    <span class="glyphicon glyphicon-sort"></span>
                  </span>
                </th>
                <th>
                  <span class="sort-link sort-link--views" data-type="<?php echo 'views'; ?>">
                    <?php echo $I18N->msg( 'pageviews' ); ?>
                    <span class="glyphicon glyphicon-sort"></span>
                  </span>
                </th>
                <th>
                  <span>
                    <?php echo $I18N->msg( 'average' ); ?>
                  </span>
                </th>
              </tr>
              <tr class="output-totals"></tr>
            </thead>
            <tbody id="mass_list"></tbody>
          </table>
        </output>
        <div class="message-container col-lg-12"></div>
        <!-- Other links -->
        <div class="col-lg-12 data-links">
          <a class="permalink" href="/massviews"><span class="glyphicon glyphicon-link"></span>
          <?php echo $I18N->msg( 'permalink' ); ?></a>
          &nbsp;&bullet;&nbsp;
          <span class="glyphicon glyphicon-download-alt"></span>
          <?php $csvlink = "<a class='download-csv' href='#'>" . $I18N->msg( 'csv' ) . "</a>"; ?>
          <?php echo $I18N->msg( 'download', array( 'variables' => array( $csvlink ), 'parsemag' => true ) ); ?>
          &middot;
          <a class="download-json" href="#"><?php echo $I18N->msg( 'json' ); ?></a>
        </div>
        <?php $currentApp = "massviews"; ?>
        <?php include "../_footer.php"; ?>
      </main>
    </div>
  </body>
</html>
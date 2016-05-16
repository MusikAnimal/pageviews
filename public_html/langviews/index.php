<!-- Langviews Analysis tool -->
<!-- Copyright 2016 MusikAnimal -->
<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title><?php echo $I18N->msg( 'langviews-title' ); ?></title>
  </head>
  <body>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'langviews-title' ); ?>
          </strong>
          <small class="app-description">
            Pageviews of an article across all languages
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
        <form id="langviews_form">
          <div class="row aqs-row options">
            <!-- Date range selector -->
            <div class="col-lg-3 col-sm-4">
              <label for="range_input">
                <?php echo $I18N->msg( 'dates' ); ?>
              </label>
              <input class="form-control aqs-date-range-selector" id="range_input">
            </div>
            <!-- Project selector -->
            <div class="col-lg-3 col-sm-3">
              <label for="project_input">
                <?php echo $I18N->msg( 'source-project' ); ?>
              </label>
              <input class="form-control" id="project_input" placeholder="en.wikipedia.org" required="required">
            </div>
            <!-- Advanced options -->
            <div class="col-lg-3 col-sm-3">
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
            <div class="col-lg-3 col-sm-2">
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
          <!-- Article URL input -->
          <div class="row aqs-row article-input-row">
            <div class="col-lg-12">
              <label for="article_input">
                <?php echo $I18N->msg( 'page' ); ?>
              </label>
              <div class="input-group">
                <input class="form-control input-control" id="article_input" placeholder="Star Wars" required="required" autocomplete="off">
                <span class="input-group-btn">
                  <button class="btn btn-primary pull-right" id="article_submit">
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
          <div class="progress-text text-center"></div>
        </div>
        <output form="langviews_form">
          <header class="output-header">
            <strong class="another-query">
              <span class="glyphicon glyphicon-chevron-left"></span>
              <?php echo $I18N->msg( 'another-query' ); ?>
            </strong>
            <h2 class="tm">
              <a class="langviews-page-name" target="_blank"></a>
              <small class="langviews-params"></small>
            </h2>
          </header>
          <table class="table table-hover output-table">
            <thead>
              <tr>
                <th>#</th>
                <th>
                  <span class="sort-link sort-link--lang" data-type="<?php echo 'lang'; ?>">
                    <?php echo $I18N->msg( 'language' ); ?>
                    <span class="glyphicon glyphicon-sort"></span>
                  </span>
                </th>
                <th>
                  <span class="sort-link sort-link--title" data-type="<?php echo 'title'; ?>">
                    <?php echo $I18N->msg( 'page-title' ); ?>
                    <span class="glyphicon glyphicon-sort"></span>
                  </span>
                </th>
                <th>
                  <span class="sort-link sort-link--badges" data-type="<?php echo 'badges'; ?>">
                    <?php echo $I18N->msg( 'badges' ); ?>
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
            <tbody id="lang_list"></tbody>
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
          <time class="elapsed-time pull-right"></time>
        </div>
        <?php $currentApp = "langviews"; ?>
        <?php include "../_footer.php"; ?>
      </main>
    </div>
  </body>
</html>
<!-- Mediaviews Analysis tool -->
<!-- Copyright 2016-17 MusikAnimal -->
<?php $currentApp = 'mediaviews'; ?>
<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title><?php echo $I18N->msg( 'mediaviews-title' ); ?></title>
  </head>
  <body class="clearfix <?php echo $rtl; ?> <?php echo $currentApp; ?>">
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
          <input class="form-control aqs-date-range-selector" id="range-input">
        </div>
        <!-- %div.data-source -->
        <!-- %label -->
        <!-- = $I18N->msg( 'query-for' ) -->
        <!-- %div.radio -->
        <!-- %label -->
        <!-- %input#file_source(type="radio" name="source" value="files" checked="checked") -->
        <!-- = $I18N->msg( 'files' ) -->
        <!-- %div.radio -->
        <!-- %label -->
        <!-- %input#category_source(type="radio" name="source" value="category") -->
        <!-- = $I18N->msg( 'category' ) -->
      </div>
    </aside>
    <main class="col-lg-8 col-md-10">
      <!-- File selector -->
      <div class="file-selector">
        <label for="file-input">
          <span class="select2-title">
            <?php echo $I18N->msg( 'files' ); ?>
          </span>
          <small class="text-muted num-entities-info">
            <?php echo $I18N->msg( 'num-files-info', [ 'variables' => [ 10 ] ] ); ?>
          </small>
        </label>
        <span class="clear-pages pull-right">
          &#x2715;
          <?php echo $I18N->msg( 'clear' ); ?>
        </span>
        <select class="aqs-select2-selector col-lg-12 invisible" id="file-input" multiple="multiple"></select>
      </div>
      <!-- %div.category-selector.none -->
      <!-- %label(for="category-input") -->
      <!-- %span.select2-title -->
      <!-- = $I18N->msg( 'category' ) -->
      <!-- %form#pv_form -->
      <!-- %div.input-group -->
      <!-- %input.form-control.input-control.category-input.col-lg-6#category-input(required="required" placeholder="en.wikipedia.org") -->
      <!-- %span.input-group-btn -->
      <!-- %button.btn.btn-primary.pull-right.btn-submit -->
      <!-- = $I18N->msg( 'submit' ) -->
      <?php include "../_data_links.php"; ?>
      <!-- Chart -->
      <div class="chart-container">
        <canvas class="aqs-chart"></canvas>
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
    <div class="col-lg-10 col-lg-offset-1">
      <h4 class="single-entity-stats text-center"></h4>
      <h5 class="single-entity-ranking text-center"></h5>
      <div class="single-entity-legend hidden-lg col-md-4 col-md-offset-4 tm"></div>
      <?php
        $columns = array(
          'file' => 'file',
          'playcounts' => 'playcounts',
          'average' => 'daily-average',
          'pageviews' => 'pageviews',
          'duration' => 'duration',
          'size' => 'size',
          'date' => 'date',
          'type' => 'file-type',
        );
      ?>
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
          </tr>
        </thead>
        <tbody class="output-list"></tbody>
      </table>
    </div>
    <?php include '../_footer.php'; ?>
    <?php include '../_modals.php'; ?>
  </body>
</html>

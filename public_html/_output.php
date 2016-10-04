<div class="col-lg-5 col-sm-8 center-block progress-bar--wrapper">
  <div class="progress">
    <div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" style="width: 0%"></div>
  </div>
  <div class="progress-counter"></div>
</div>
<output class="clearfix" form="langviews_form">
  <header class="output-header clearfix">
    <strong class="another-query">
      <span class="glyphicon glyphicon-chevron-left"></span>
      <?php echo $I18N->msg( 'another-query' ); ?>
    </strong>
    <h2 class="tm">
      <a class="output-title" target="_blank"></a>
      <small class="output-params"></small>
      <span class="btn-group view-options pull-right">
        <button class="active btn btn-default view-btn view-btn--list" type="button" href="#" data-value="list">
          <span class="glyphicon glyphicon-list view-options--list"></span>
          <?php echo $I18N->msg( 'list' ); ?>
        </button>
        <button class="btn btn-default view-btn view-btn--chart" type="button" href="#" data-value="chart">
          <span class="glyphicon glyphicon-chart"></span>
          <?php echo $I18N->msg( 'chart' ); ?>
        </button>
      </span>
    </h2>
  </header>
  <?php include "_data_links.php"; ?>
  <table class="list-view table table-hover output-table">
    <thead>
      <tr>
        <th>
          <span>#</span>
        </th>
        <?php foreach( $columns as $column => $translation ) { ?>
          <th>
            <span class="sort-link sort-link--<?php echo $column; ?>" data-type="<?php echo $column; ?>">
              <?php echo $I18N->msg( $translation ); ?>
              <span class="glyphicon glyphicon-sort"></span>
            </span>
          </th>
        <?php } ?>
        <th>
          <span>
            <?php echo $I18N->msg( 'average' ); ?>
          </span>
        </th>
      </tr>
      <tr class="output-totals"></tr>
    </thead>
    <tbody id="output_list"></tbody>
  </table>
  <div class="chart-view chart-container">
    <canvas class="aqs-chart"></canvas>
  </div>
  <div class="col-lg-12 tm clearfix legend-elapsed-time">
    <span id="chart-legend" class="chart-view pull-left"></span>
    <span class="elapsed-time pull-right"></span>
  </div>
</output>
<div class="message-container col-lg-12"></div>

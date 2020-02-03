<div class="col-lg-12 data-links invisible">
  <div class="chart-buttons">
    <button class="btn btn-default btn-sm btn-chart-type chart-specific js-test-change-chart" data-target="#chart-type-modal" data-toggle="modal"><span class="glyphicon glyphicon-th"></span>
    <?php echo $I18N->msg( 'change-chart' ); ?></button>
    <a class="btn btn-default btn-sm permalink" href=""><span class="glyphicon glyphicon-link"></span>
    <?php echo $I18N->msg( 'permalink' ); ?></a>
    <input class="permalink-copy">
    <div class="btn-group dropdown download-btn-group">
      <button class="btn btn-default btn-sm dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <span class="glyphicon glyphicon-download-alt"></span>
        <?php echo $I18N->msg( 'download-label' ); ?>
        <span class="caret"></span>
      </button>
      <ul class="dropdown-menu">
        <li>
          <a class="download-csv" href="#">
            <?php echo $I18N->msg( 'csv' ); ?>
          </a>
        </li>
        <li>
          <a class="download-json" href="#">
            <?php echo $I18N->msg( 'json' ); ?>
          </a>
        </li>
        <li class="chart-specific">
          <a class="download-png" href="#">
            <?php echo $I18N->msg( 'png' ); ?>
          </a>
        </li>
        <li class="divider chart-specific" role="separator"></li>
        <li class="chart-specific">
          <a class="print-chart" href="#">
            <span class="glyphicon glyphicon-print"></span>
            <?php echo $I18N->msg( 'print' ); ?>
          </a>
        </li>
      </ul>
    </div>
  </div>
  <span class="chart-toggles chart-specific">
    <span class="pull-right">
      <label class="logarithmic-scale">
        <input id="logarithmic-checkbox" type="checkbox">
        <?php echo $I18N->msg( 'logarithmic-scale' ); ?>
      </label>
    </span>
    <span class="pull-right">
      <label class="begin-at-zero">
        <input class="begin-at-zero-option" type="checkbox">
        <?php echo $I18N->msg( 'begin-at-zero' ); ?>
      </label>
    </span>
    <span class="pull-right">
      <label class="show-labels">
        <input class="show-labels-option" type="checkbox">
        <?php echo $I18N->msg( 'show-values' ); ?>
      </label>
    </span>
  </span>
</div>

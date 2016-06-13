<div class="row data-links invisible">
  <div class="col-lg-12">
    <button class="btn btn-default btn-sm chart-specific js-test-change-chart" data-target="#chart-type-modal" data-toggle="modal"><span class="glyphicon glyphicon-th"></span>
    <?php echo $I18N->msg( 'change-chart' ); ?></button>
    <button class="btn btn-default btn-sm btn-settings js-test-settings" data-target="#settings-modal" data-toggle="modal"><span class="glyphicon glyphicon-wrench"></span>
    <?php echo $I18N->msg( 'settings' ); ?></button>
    <a class="btn btn-default btn-sm permalink" href=""><span class="glyphicon glyphicon-link"></span>
    <?php echo $I18N->msg( 'permalink' ); ?></a>
    <span class="download-btn-group">
      <span class="input-group-addon">
        <span class="glyphicon glyphicon-download-alt"></span>
        Download
      </span>
      <span class="input-group-btn">
        <button class="btn btn-default btn-sm download-csv">
          <?php echo $I18N->msg( 'csv' ); ?>
        </button>
      </span>
      <span class="input-group-btn">
        <button class="btn btn-default btn-sm download-json"><?php echo $I18N->msg( 'json' ); ?></button>
      </span>
    </span>
    <span class="pull-right chart-specific">
      <label class="logarithmic-scale">
        <input class="logarithmic-scale-option" type="checkbox">
        <?php echo $I18N->msg( 'logarithmic-scale' ); ?>
      </label>
    </span>
  </div>
</div>
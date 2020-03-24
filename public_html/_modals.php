<div class="modal fade" id="chart-type-modal" role="dialog" tabindex="-1">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button class="close" aria-label="Close" data-dismiss="modal" type="button">
          <span aria-hidden="true">&times;</span>
        </button>
        <h4 class="modal-title">
          <?php echo $I18N->msg( 'chart-types' ); ?>
        </h4>
      </div>
      <div class="modal-body">
        <div>
          <strong class="multi-page-chart-node">
            <?php echo $I18N->msg( 'daily-pageviews' ); ?>
          </strong>
          <span class="modal-chart-type">
            <a class="js-test-line-chart" data-dismiss="modal" data-type="line" href="#">
              <img src="images/line-chart-small.jpg" alt="<?php echo $I18N->msg( 'line' ); ?>">
              <?php echo $I18N->msg( 'line' ); ?>
            </a>
          </span>
          <span class="modal-chart-type">
            <a class="js-test-bar-chart" data-dismiss="modal" data-type="bar" href="#">
              <img src="images/bar-chart-small.jpg" alt="<?php echo $I18N->msg( 'bar' ); ?>">
              <?php echo $I18N->msg( 'bar' ); ?>
            </a>
          </span>
          <span class="modal-chart-type">
            <a data-dismiss="modal" data-type="radar" href="#">
              <img src="images/radar-chart-small.jpg" alt="<?php echo $I18N->msg( 'radar' ); ?>">
              <?php echo $I18N->msg( 'radar' ); ?>
            </a>
          </span>
        </div>
        <div class="multi-page-chart-node">
          <hr>
          <div>
            <strong>
              <?php echo $I18N->msg( 'total-pageviews' ); ?>
            </strong>
            <span class="modal-chart-type">
              <a class="js-test-pie-chart" data-dismiss="modal" data-type="pie" href="#">
                <img src="images/pie-chart-small.jpg" alt="<?php echo $I18N->msg( 'pie' ); ?>">
                <?php echo $I18N->msg( 'pie' ); ?>
              </a>
            </span>
            <span class="modal-chart-type">
              <a data-dismiss="modal" data-type="doughnut" href="#">
                <img src="images/doughnut-chart-small.jpg" alt="<?php echo $I18N->msg( 'doughnut' ); ?>">
                <?php echo $I18N->msg( 'doughnut' ); ?>
              </a>
            </span>
            <span class="modal-chart-type">
              <a data-dismiss="modal" data-type="polarArea" href="#">
                <img src="images/polararea-chart-small.jpg" alt="<?php echo $I18N->msg( 'polar-area' ); ?>">
                <?php echo $I18N->msg( 'polar-area' ); ?>
              </a>
            </span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-default" data-dismiss="modal" type="button">
          <?php echo $I18N->msg( 'cancel' ); ?>
        </button>
      </div>
    </div>
  </div>
</div>
<div class="modal fade settings-modal" id="settings-modal" role="dialog" tabindex="-1">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button aria-label="Close" class="close" data-dismiss="modal" type="button">
          <span aria-hidden="true">&times;</span>
        </button>
        <h4 class="modal-title">
          <?php echo $I18N->msg( 'settings' ); ?>
        </h4>
      </div>
      <form class="modal-body">
        <p>
          <?php echo $I18N->msg( 'settings-notice' ); ?>
        </p>
        <fieldset>
          <div class="checkbox">
            <label>
              <input name="alwaysRedirects" type="checkbox">
                <?php echo $I18N->msg( 'always-include-redirects' ); ?>
              </input>
            </label>
          </div>
        </fieldset>
        <fieldset class="radio-list search-method-options">
          <?php echo $I18N->msg( 'search-method' ); ?>
          <div class="radio">
            <label>
              <input class="js-test-prefixsearch" name="autocomplete" type="radio" value="autocomplete">
              <?php echo $I18N->msg( 'autocompletion' );; ?>
            </label>
          </div>
          <div class="radio">
            <label>
              <input class="js-test-opensearch" name="autocomplete" type="radio" value="autocomplete_redirects">
              <?php echo $I18N->msg( 'autocompletion-redirects' );; ?>
            </label>
          </div>
          <div class="radio">
            <label>
              <input name="autocomplete" type="radio" value="no_autocomplete">
              <?php echo $I18N->msg( 'no-autocompletion' ); ?>
            </label>
          </div>
        </fieldset>
        <fieldset>
          <?php echo $I18N->msg( 'localization' ); ?>
          <div class="checkbox">
            <label>
              <input class="js-test-format-numbers" name="numericalFormatting" type="checkbox">
              <?php echo $I18N->msg( 'format-numbers' ); ?>
            </label>
          </div>
          <div class="checkbox">
            <label>
              <input class="js-test-localize-dates" name="localizeDateFormat" type="checkbox">
              <?php echo $I18N->msg( 'localize-dates' ); ?>
            </label>
          </div>
        </fieldset>
        <fieldset class="chart-specific">
          <?php echo $I18N->msg( 'chart-preferences' ); ?>
          <div class="checkbox">
            <label>
              <input class="js-test-autolog" name="autoLogDetection" type="checkbox">
              <?php echo $I18N->msg( 'autolog-option' ); ?>
            </label>
          </div>
          <div class="checkbox">
            <label>
              <input class="js-test-begin-at-zero" name="beginAtZero" type="checkbox">
              <?php echo $I18N->msg( 'begin-at-zero-option' ); ?>
            </label>
          </div>
          <div class="checkbox">
            <label>
              <input class="js-test-remember-chart" name="rememberChart" type="checkbox">
              <?php echo $I18N->msg( 'remember-chart-option' ); ?>
            </label>
          </div>
          <div class="checkbox">
            <label>
              <input class="js-test-bezier-curve" name="bezierCurve" type="checkbox">
              <?php echo $I18N->msg( 'bezier-curve-option' ); ?>
            </label>
          </div>
        </fieldset>
      </form>
      <div class="modal-footer">
        <button class="btn btn-default cancel-settings-btn" data-dismiss="modal" type="button">
          <?php echo $I18N->msg( 'cancel' ); ?>
        </button>
        <button class="btn btn-primary save-settings-btn" data-dismiss="modal" type="button">
          <?php echo $I18N->msg( 'save' ); ?>
        </button>
      </div>
    </div>
  </div>
</div>

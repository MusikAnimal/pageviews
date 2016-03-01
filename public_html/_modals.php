<div class='modal fade' id='chart-type-modal' role='dialog' tabindex='-1'>
  <div class='modal-dialog' role='document'>
    <div class='modal-content'>
      <div class='modal-header'>
        <button arialabel='Close' class='close' data-dismiss='modal' type='button'>
          <span ariahidden='true'>&times;</span>
        </button>
        <h4 class='modal-title'>Chart types</h4>
      </div>
      <div class='modal-body'>
        <div>
          <strong>Articles by daily pageviews</strong>
          <span class='modal-chart-type'>
            <a data-dismiss='modal' data-type='Line' href='#'>
              <img src='images/line-chart-small.jpg'>
              Line
            </a>
          </span>
          <span class='modal-chart-type'>
            <a data-dismiss='modal' data-type='Bar' href='#'>
              <img src='images/bar-chart-small.jpg'>
              Bar
            </a>
          </span>
          <span class='modal-chart-type'>
            <a data-dismiss='modal' data-type='Radar' href='#'>
              <img src='images/radar-chart-small.jpg'>
              Radar
            </a>
          </span>
        </div>
        <hr>
        <div>
          <strong>Articles by total number of pageviews</strong>
          <span class='modal-chart-type'>
            <a data-dismiss='modal' data-type='Pie' href='#'>
              <img src='images/pie-chart-small.jpg'>
              Pie
            </a>
          </span>
          <span class='modal-chart-type'>
            <a data-dismiss='modal' data-type='Doughnut' href='#'>
              <img src='images/doughnut-chart-small.jpg'>
              Doughnut
            </a>
          </span>
          <span class='modal-chart-type'>
            <a data-dismiss='modal' data-type='PolarArea' href='#'>
              <img src='images/polararea-chart-small.jpg'>
              Polar Area
            </a>
          </span>
        </div>
      </div>
      <div class='modal-footer'>
        <button class='btn btn-default' data-dismiss='modal' type='button'>Cancel</button>
      </div>
    </div>
  </div>
</div>
<div class='modal fade' id='settings-modal' role='dialog' tabindex='-1'>
  <div class='modal-dialog' role='document'>
    <div class='modal-content'>
      <div class='modal-header'>
        <button arialabel='Close' class='close' data-dismiss='modal' type='button'>
          <span ariahidden='true'>&times;</span>
        </button>
        <h4 class='modal-title'>Settings</h4>
      </div>
      <form class='modal-body'>
        <p>
          Your settings will be remembered on the same browser and computer.
        </p>
        <fieldset class='radio-list'>
          Search method:
          <div class='radio'>
            <label>
              <input name='autocomplete' type='radio' value='autocomplete'>
              Autocompletion (<a href="https://www.mediawiki.org/wiki/API:Prefixsearch" target="_blank">prefixsearch</a>)
            </label>
          </div>
          <div class='radio'>
            <label>
              <input name='autocomplete' type='radio' value='autocomplete_redirects'>
              Autocompletion including redirects (<a href="https://www.mediawiki.org/wiki/API:Opensearch" target="_blank">opensearch</a>)
            </label>
          </div>
          <div class='radio'>
            <label>
              <input name='autocomplete' type='radio' value='no_autocomplete'>
              No autocompletion
            </label>
          </div>
        </fieldset>
        <fieldset class='radio-list palette-list'>
          Color scheme:
        </fieldset>
        <fieldset>
          Other options:
          <div class='checkbox'>
            <label>
              <input name='numericalFormatting' type='checkbox' value>
              Format numerical data
            </label>
          </div>
          <div class='checkbox'>
            <label>
              <input name='localizeDateFormat' type='checkbox' value>
              Localize date format
            </label>
          </div>
        </fieldset>
      </form>
      <div class='modal-footer'>
        <button class='btn btn-default cancel-settings-btn' data-dismiss='modal' type='button'>Cancel</button>
        <button class='btn btn-primary save-settings-btn' data-dismiss='modal' type='button'>Save</button>
      </div>
    </div>
  </div>
</div>

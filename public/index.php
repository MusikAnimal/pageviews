<?php
require_once __DIR__ . '/../vendor/autoload.php';
$I18N = new Intuition( 'pageviews' );
$I18N->registerDomain( 'pageviews', __DIR__ . '/../messages' );
?>
<!-- Pageviews Comparison tool -->
<!-- Original code forked from https://gist.github.com/marcelrf/49738d14116fd547fe6d courtesy of marcelrf -->
<!-- Copyright 2016 MusikAnimal -->
<!-- Redistributed under the MIT License: https://opensource.org/licenses/MIT -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset='utf-8'>
    <meta content='yes' name='apple-mobile-web-app-capable'>
    <meta content='black-translucent' name='apple-mobile-web-app-status-bar-style'>
    <meta content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0' name='viewport'>
    <link href='application.css' rel='stylesheet'>
    <script src='application.js'></script>
    <title><?= $I18N->msg( 'title' ) ?></title>
  </head>
  <body>
    <div class='container'>
      <div class='col-lg-offset-2'>
        <!-- Header -->
        <header class='row aqs-row'>
          <div class='col-lg-10 text-center'>
            <h4>
              <strong>
                <?= $I18N->msg( 'title' ) ?>
              </strong>
            </h4>
          </div>
        </header>
        <!-- Site notice -->
        <div class='col-lg-10 text-center site-notice-wrapper'>
          <div class='site-notice'></div>
        </div>
        <div class='row aqs-row options'>
          <!-- Date range selector -->
          <div class='col-lg-4'>
            <label for='range-input'><?= $I18N->msg( 'dates' ) ?></label>
            <?php
              $datelinks = "<a data-value='10' href='#'>10</a>"
                . " <a data-value='20' href='#'>20</a>"
                . " <a data-value='30' href='#'>30</a>"
                . " <a data-value='60' href='#'>60</a>"
                . " <a data-value='90' href='#'>90</a>";
            ?>
            <span class='date-latest'>
              <?= $I18N->msg( 'latest-days', array( 'variables' => array( $datelinks ) ) ) ?>
            </span>
            <input class='form-control aqs-date-range-selector' id='range-input'>
          </div>
          <!-- Project selector -->
          <div class='col-lg-2'>
            <label for='project-input'><?= $I18N->msg( 'project' ) ?></label>
            <input class='form-control aqs-project-input' id='project-input' placeholder='en.wikipedia.org'>
          </div>
          <!-- Advanced options -->
          <div class='col-lg-2'>
            <label for='platform-select'><?= $I18N->msg( 'platform' ) ?></label>
            <select class='form-control' id='platform-select'>
              <option value='all-access'><?= $I18N->msg( 'all' ) ?></option>
              <option value='desktop'><?= $I18N->msg( 'desktop' ) ?></option>
              <option value='mobile-app'><?= $I18N->msg( 'mobile-app' ) ?></option>
              <option value='mobile-web'><?= $I18N->msg( 'mobile-web' ) ?></option>
            </select>
          </div>
          <div class='col-lg-2'>
            <label for='agent-select'><?= $I18N->msg( 'agent' ) ?></label>
            <select class='form-control' id='agent-select'>
              <option value='all-agents'><?= $I18N->msg( 'all' ) ?></option>
              <option selected='selected' value='user'><?= $I18N->msg( 'user' ) ?></option>
              <option value='spider'><?= $I18N->msg( 'spider' ) ?></option>
              <option value='bot'><?= $I18N->msg( 'bot' ) ?></option>
            </select>
          </div>
        </div>
        <!-- Article selector -->
        <div class='row aqs-row'>
          <div class='col-lg-10'>
            <label for='article-input'><?= $I18N->msg( 'pages' ) ?></label>
            <!-- Button trigger modal -->
            <!-- %a.pull-right{href: "#", "data-toggle": "modal", "data-target": "#import-modal"} -->
            <!-- Import -->
            <select class='aqs-article-selector col-lg-12' id='article-input' multiple='multiple'></select>
          </div>
        </div>
        <!-- Chart -->
        <div class='chart-container col-lg-10 loading'>
          <!-- inline styles since the ad blocker might block loading of assets -->
          <div class='ad-block-notice text-center'>
          	<?php $url = "<span style='font-family: Consolas, Lucida Console, monospace;'>/pageviews/*</span>"; ?>
            <?= $I18N->msg( 'chart-error', array( 'variables' => array( $url ) ) ) ?>
          </div>
          <canvas class='aqs-chart'></canvas>
        </div>
        <div class='message-container col-lg-10'></div>
        <!-- Legend -->
        <div class='col-lg-10' id='chart-legend'></div>
        <!-- Other links -->
        <div class='col-lg-10 data-links'>
          <a data-target='#chart-type-modal' data-toggle='modal' href='#'><?= $I18N->msg( 'change-chart' ) ?></a>
          &bullet;
          <a data-target='#settings-modal' data-toggle='modal' href='#'><?= $I18N->msg( 'settings' ) ?></a>
          &bullet;
          <?php $csvlink = "<a class='download-csv' href='#'>" . $I18N->msg( 'csv' ) . "</a>"; ?>
          <?= $I18N->msg( 'download', array( 'variables' => array( $csvlink ) ) ) ?>
          &middot;
          <a class='download-json' href='#'><?= $I18N->msg( 'json' ) ?></a>
        </div>
        <footer class='col-lg-10'>
          <span>
            Brought to you by
            <a href='https://en.wikipedia.org/wiki/User:MusikAnimal'>MusikAnimal</a>
            and
            <a href='https://wikimediafoundation.org/wiki/User:Mforns_(WMF)'>Marcel Ruiz Forns</a>.
          </span>
          <span class='nowrap'>
          	<?php
          		$heart = "<span class='heart'>&hearts;</span>";
          		$host = "<a href='https://wikitech.wikimedia.org/wiki/Portal:Tool_Labs'>" . $I18N->msg( 'tool-labs' ) . "</a>";
          	?>
            <?= $I18N->msg( 'hosted', array( 'variables' => array( $heart, $host ) ) ) ?>
          </span>
          <div>
            <a href='/pageviews/faq'><?= $I18N->msg( 'faq' ) ?></a>
            &middot;
            <a data-target='#disclaimer-modal' data-toggle='modal' href='#'><?= $I18N->msg( 'disclaimer' ) ?></a>
            &middot;
            <a href='/pageviews/url_structure'><?= $I18N->msg( 'url-structure' ) ?></a>
            &middot;
            <a href='https://github.com/MusikAnimal/pageviews'><?= $I18N->msg( 'view-source' ) ?></a>
            &middot;
            <a href='https://github.com/MusikAnimal/pageviews/issues'><?= $I18N->msg( 'report-issue' ) ?></a>
          </div>
        </footer>
        <div class='modal fade' id='disclaimer-modal' role='dialog' tabindex='-1'>
          <div class='modal-dialog' role='document'>
            <div class='modal-content'>
              <div class='modal-header'>
                <button arialabel='Close' class='close' data-dismiss='modal' type='button'>
                  <span ariahidden='true'>&times;</span>
                </button>
                <h4 class='modal-title'><?= $I18N->msg( 'disclaimer' ) ?></h4>
              </div>
              <div class='modal-body'>
                <div>
                	<?php
										$api = "<a href='https://wikimedia.org/api/rest_v1/?doc#/'>" . $I18N->msg( 'rest-api' ) . "</a>";
										$experimental = "<b><a href='https://www.mediawiki.org/wiki/API_versioning#Experimental'>" . $I18N->msg( 'experimental' ) . "</a></b>";
										$maintainer = "<a href='https://en.wikipedia.org/wiki/User:MusikAnimal'>" . $I18N->msg( 'maintainer' ) . "</a>";
									?>
                  <?= $I18N->msg( 'disclaimer-text', array( 'variables' => array( $api, $experimental, $maintainer ) ) ) ?>
                </div>
              </div>
              <div class='modal-footer'>
                <button class='btn btn-primary' data-dismiss='modal' type='button'><?= $I18N->msg( 'ok' ) ?></button>
              </div>
            </div>
          </div>
        </div>
        <div class='modal fade' id='chart-type-modal' role='dialog' tabindex='-1'>
          <div class='modal-dialog' role='document'>
            <div class='modal-content'>
              <div class='modal-header'>
                <button arialabel='Close' class='close' data-dismiss='modal' type='button'>
                  <span ariahidden='true'>&times;</span>
                </button>
                <h4 class='modal-title'><?= $I18N->msg( 'chart-types' ) ?></h4>
              </div>
              <div class='modal-body'>
                <div>
                  <strong><?= $I18N->msg( 'daily-pageviews' ) ?></strong>
                  <span class='modal-chart-type'>
                    <a data-dismiss='modal' data-type='Line' href='#'>
                      <img src='images/line-chart-small.jpg'>
                      <?= $I18N->msg( 'line' ) ?>
                    </a>
                  </span>
                  <span class='modal-chart-type'>
                    <a data-dismiss='modal' data-type='Bar' href='#'>
                      <img src='images/bar-chart-small.jpg'>
                      <?= $I18N->msg( 'bar' ) ?>
                    </a>
                  </span>
                  <span class='modal-chart-type'>
                    <a data-dismiss='modal' data-type='Radar' href='#'>
                      <img src='images/radar-chart-small.jpg'>
                      <?= $I18N->msg( 'radar' ) ?>
                    </a>
                  </span>
                </div>
                <hr>
                <div>
                  <strong><?= $I18N->msg( 'total-pageviews' ) ?></strong>
                  <span class='modal-chart-type'>
                    <a data-dismiss='modal' data-type='Pie' href='#'>
                      <img src='images/pie-chart-small.jpg'>
                      <?= $I18N->msg( 'pie' ) ?>
                    </a>
                  </span>
                  <span class='modal-chart-type'>
                    <a data-dismiss='modal' data-type='Doughnut' href='#'>
                      <img src='images/doughnut-chart-small.jpg'>
                      <?= $I18N->msg( 'doughnut' ) ?>
                    </a>
                  </span>
                  <span class='modal-chart-type'>
                    <a data-dismiss='modal' data-type='PolarArea' href='#'>
                      <img src='images/polararea-chart-small.jpg'>
                      <?= $I18N->msg( 'polar-area' ) ?>
                    </a>
                  </span>
                </div>
              </div>
              <div class='modal-footer'>
                <button class='btn btn-default' data-dismiss='modal' type='button'><?= $I18N->msg( 'cancel' ) ?></button>
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
                <h4 class='modal-title'><?= $I18N->msg( 'settings' ) ?></h4>
              </div>
              <form class='modal-body'>
                <p>
                  <?= $I18N->msg( 'settings-notice' ) ?>
                </p>
                <fieldset class='radio-list'>
                  <?= $I18N->msg( 'search-method' ) ?>
                  <div class='radio'>
                    <label>
                      <input name='autocomplete' type='radio' value='autocomplete'>
                      <?php $prefixsearchlink = "<a href='https://www.mediawiki.org/wiki/API:Prefixsearch' target='_blank'>" . $I18N->msg( 'prefixsearch' ) . "</a>"; ?>
                      <?= $I18N->msg( 'autocompletion', array( 'variables' => array( $prefixsearchlink ) ) ) ?>
                    </label>
                  </div>
                  <div class='radio'>
                    <label>
                      <input name='autocomplete' type='radio' value='autocomplete_redirects'>
                      <?php $opensearchlink = "<a href='https://www.mediawiki.org/wiki/API:Opensearch' target='_blank'>" . $I18N->msg( 'opensearch' ) . "</a>"; ?>
                      <?= $I18N->msg( 'autocompletion-redirects', array( 'variables' => array( $opensearchlink ) ) ) ?>
                    </label>
                  </div>
                  <div class='radio'>
                    <label>
                      <input name='autocomplete' type='radio' value='no_autocomplete'>
                      <?= $I18N->msg( 'no-autocompletion' ) ?>
                    </label>
                  </div>
                </fieldset>
                <fieldset class='radio-list palette-list'>
                  <?= $I18N->msg( 'color-scheme' ) ?>
                </fieldset>
                <fieldset>
                  <?= $I18N->msg( 'other-options' ) ?>
                  <div class='checkbox'>
                    <label>
                      <input name='numericalFormatting' type='checkbox' value>
                      <?= $I18N->msg( 'format-numbers' ) ?>
                    </label>
                  </div>
                  <div class='checkbox'>
                    <label>
                      <input name='localizeDateFormat' type='checkbox' value>
                      <?= $I18N->msg( 'localize-dates' ) ?>
                    </label>
                  </div>
                  <!-- %div.checkbox -->
                  <!-- %label -->
                  <!-- %input.js-option-canonical-namespace{type: "checkbox"} -->
                  <!-- Remove canonical namespace from page labels -->
                </fieldset>
              </form>
              <div class='modal-footer'>
                <button class='btn btn-default cancel-settings-btn' data-dismiss='modal' type='button'><?= $I18N->msg( 'cancel' ) ?></button>
                <button class='btn btn-primary save-settings-btn' data-dismiss='modal' type='button'><?= $I18N->msg( 'save' ) ?></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>

<div id="ad_blocker_notice" style="display:none">
  <h3>Looks like you are using an ad blocker!</h3>
  <br>
  Pageviews Analysis shows no ads, but the ad blockers blacklist websites that collect metrics.
  In our case, we're just trying to show you metrics, not collect them!
  <h2>
    Please whitelist
    <code>
      tools.wmflabs.org
    </code>
  </h2>
  <h4>AdBlock Plus</h4>
  <p>
    Click on the AdBlock Plus icon and select <i>Disable on tools.wmflabs.org</i>. Reload the page.
  </p>
  <h4>uBlock</h4>
  <p>
    Click on the uBlock icon and then click on the large power icon. Reload the page.
  </p>
</div>
<div id="cookie_disabled_notice" class="col-lg-10 text-center" style="display:none">
  <h3>Looks like you have cookies disabled!</h3>
  <br>
  <p>
    Pageviews Analysis uses an internationalization library that requires cookies to function.
    <br>
    Only your language preference is stored in a cookie. No sensitive information is recorded.
  </p>
  <br>
  <p>
    <strong>Please enable cookies or whitelist <code>tools.wmflabs.org</code> if you are using a cookie blocker.</strong>
  </p>
</div>
<footer class="col-lg-10">
  <span>
    <?php $MusikAnimal = "<a href='https://en.wikipedia.org/wiki/User:MusikAnimal'>MusikAnimal</a>"; ?>
    <?php $Kaldari = "<a href='https://en.wikipedia.org/wiki/User:Kaldari'>Kaldari</a>"; ?>
    <?php $MarcelRuizForns = "<a href='https://en.wikipedia.org/wiki/User:Mforns_(WMF)'>Marcel Ruiz Forns</a>"; ?>
    <?php echo $I18N->msg( 'credits', array( 'variables' => array( $MusikAnimal, $Kaldari, $MarcelRuizForns ) ) );; ?>
  </span>
  <span class="nowrap">
    <?php $heart = "<span class='heart'>&hearts;</span>"; ?>
    <?php $host = "<a href='https://wikitech.wikimedia.org/wiki/Portal:Tool_Labs'>" . $I18N->msg( 'tool-labs' ) . "</a>"; ?>
    <?php echo $I18N->msg( 'hosted', array( 'variables' => array( $heart, $host ) ) );; ?>
  </span>
  <div>
    <a href="/<?php echo $app; ?>/faq">
      <?php echo $I18N->msg( 'faq' ); ?>
    </a>
    &middot;
    <a href="#" data-toggle="modal" data-target="#disclaimer-modal">
      <?php echo $I18N->msg( 'disclaimer' ); ?>
    </a>
    &middot;
    <a href="/<?php echo $app; ?>/url_structure">
      <?php echo $I18N->msg( 'url-structure' ); ?>
    </a>
    &middot;
    <a href="https://github.com/MusikAnimal/pageviews">
      <?php echo $I18N->msg( 'view-source' ); ?>
    </a>
    &middot;
    <a href="https://github.com/MusikAnimal/pageviews/issues">
      <?php echo $I18N->msg( 'report-issue' ); ?>
    </a>
  </div>
</footer>
<div id="disclaimer-modal" class="modal fade" role="dialog" tabindex="-1">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button class="close" arialabel="Close" data-dismiss="modal" type="button">
          <span ariahidden="true">&times;</span>
        </button>
        <h4 class="modal-title">
          <?php echo $I18N->msg( 'disclaimer' ); ?>
        </h4>
      </div>
      <div class="modal-body">
        <?php $api = "<a href='https://wikimedia.org/api/rest_v1/?doc#/'>" . $I18N->msg( 'rest-api' ) . "</a>"; ?>
        <?php $maintainer = "maintainers"; ?>
        <?php echo $I18N->msg( 'disclaimer-text', array( 'variables' => array( $api, $maintainer ) ) );; ?>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" data-dismiss="modal" type="button">
          <?php echo $I18N->msg( 'ok' ); ?>
        </button>
      </div>
    </div>
  </div>
</div>
<script type="text/javascript">
//<![CDATA[
  if(!window.noAdBlockers) {
    var noticeContent = document.getElementById('ad_blocker_notice');
    document.querySelector('body').innerHTML = noticeContent.innerHTML;
  }
  
  var cookieEnabled = navigator.cookieEnabled ? true : false;
  if (typeof navigator.cookieEnabled === "undefined" && !cookieEnabled) {
      document.cookie = "testcookie";
      cookieEnabled = (document.cookie.indexOf("testcookie") !== -1) ? true : false;
  }
  
  if (!cookieEnabled) {
    document.querySelector('main').style.display = 'none';
    document.getElementById('cookie_disabled_notice').style.display = 'block';
  }
  
  
//]]>
</script>

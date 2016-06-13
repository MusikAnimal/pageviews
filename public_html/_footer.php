<div id="ad_blocker_notice" style="display:none">
  <div style="padding:20px">
    <h3>Looks like you are using an ad blocker!</h3>
    Pageviews Analysis shows no ads, but the ad blockers blacklist websites that collect metrics.
    In our case, we're just trying to show you metrics, not collect them!
    <p>
      This issue may be resolved by simply updating your ad blocker, specifically the
      <code>EasyPrivacy</code>
      list.
    </p>
    <p>
      Or you can manually whitelist
      <code>
        tools.wmflabs.org
      </code>
    </p>
    <h4>AdBlock Plus</h4>
    <p>
      Click on the AdBlock Plus icon and select <i>Disable on tools.wmflabs.org</i>. Reload the page.
    </p>
    <h4>uBlock</h4>
    <p>
      Click on the uBlock icon and then click on the large power icon. Reload the page.
    </p>
  </div>
</div>
<footer class="row">
  <div class="col-lg-12">
    <hr>
    <div class="footer-nav">
      <?php include "_lang_selector.php"; ?>
      <div class="interapp-links bm">
        <?php $apps = array( 'pageviews', 'langviews', 'topviews', 'siteviews', 'massviews' ); ?>
        <?php $appLinks = array(); ?>
        <?php foreach( $apps as $app ) { ?>
          <?php $i18nName = $app === 'pageviews' ? '' : $app . '-'; ?>
          <?php if ( $app === $currentApp ) { ?>
            <?php $appLinks[] = $I18N->msg( $app ); ?>
          <?php } else { ?>
            <?php $appLinks[] = "<a class='interapp-link interapp-link--{$app}' href='/{$app}'>{$I18N->msg( $app )}</a>"; ?>
          <?php } ?>
        <?php } ?>
        <?php echo implode( ' &bullet; ', $appLinks ); ?>
      </div>
    </div>
    <span>
      <?php $MusikAnimal = "<a href='https://en.wikipedia.org/wiki/User:MusikAnimal'>MusikAnimal</a>"; ?>
      <?php $Kaldari = "<a href='https://en.wikipedia.org/wiki/User:Kaldari'>Kaldari</a>"; ?>
      <?php $MarcelRuizForns = "<a href='https://en.wikipedia.org/wiki/User:Mforns_(WMF)'>Marcel Ruiz Forns</a>"; ?>
      <?php echo $I18N->msg( 'credits', array( 'variables' => array( $MusikAnimal, $Kaldari, $MarcelRuizForns ), 'parsemag' => true ) );; ?>
    </span>
    <div>
      <span class="nowrap">
        <?php $heart = "<span class='heart'>&hearts;</span>"; ?>
        <?php $host = "<a href='https://wikitech.wikimedia.org/wiki/Portal:Tool_Labs'>" . $I18N->msg( 'tool-labs' ) . "</a>"; ?>
        <?php echo $I18N->msg( 'hosted', array( 'variables' => array( $heart, $host ), 'parsemag' => true ) );; ?>
      </span>
      <span class="nowrap">
        <?php $translateWiki = "<a href='https://translatewiki.net/'>translatewiki.net</a>"; ?>
        <?php $intuition = "<a href='https://tools.wmflabs.org/intuition/#tab-about'>Intuition</a>"; ?>
        <?php echo $I18N->msg( 'translation-credits', array( 'variables' => array( $translateWiki, $intuition ), 'parsemag' => true ) ); ?>
      </span>
    </div>
    <div>
      <a href="/<?php echo $currentApp; ?>/faq"><?php echo $I18N->msg( 'faq' ); ?></a>
      &middot;
      <a href="#" data-toggle="modal" data-target="#disclaimer-modal"><?php echo $I18N->msg( 'disclaimer' ); ?></a>
      &middot;
      <a href="/<?php echo $currentApp; ?>/url_structure"><?php echo $I18N->msg( 'url-structure' ); ?></a>
      &middot;
      <a href="https://github.com/MusikAnimal/pageviews"><?php echo $I18N->msg( 'view-source' ); ?></a>
      &middot;
      <a href="https://github.com/MusikAnimal/pageviews/issues"><?php echo $I18N->msg( 'report-issue' ); ?></a>
    </div>
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
        <?php echo $I18N->msg( 'disclaimer-text', array( 'variables' => array( $api ), 'parsemag' => true ) );; ?>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" data-dismiss="modal" type="button">
          <?php echo $I18N->msg( 'ok' ); ?>
        </button>
      </div>
    </div>
  </div>
</div>
<?php if ( strpos ( $_SERVER['PHP_SELF'], 'faq' ) !== false ) { ?>
  <script type="text/javascript">
  //<![CDATA[
    if (location.hash) $(location.hash).addClass('flash');
    
  //]]>
  </script>
<?php } ?>
<script type="text/javascript">
//<![CDATA[
  if ( !window.noAdBlockers ) {
    var noticeContent = document.getElementById('ad_blocker_notice');
    document.querySelector('body').innerHTML = noticeContent.innerHTML;
  }
  
//]]>
</script>
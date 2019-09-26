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
<div class="spacer"></div>
<footer>
  <hr>
  <span>
    <?php $MusikAnimal = "<a href='https://en.wikipedia.org/wiki/User:MusikAnimal'>MusikAnimal</a>"; ?>
    <?php $Kaldari = "<a href='https://en.wikipedia.org/wiki/User:Kaldari'>Kaldari</a>"; ?>
    <?php $MarcelRuizForns = "<a href='https://en.wikipedia.org/wiki/User:Mforns_(WMF)'>Marcel Ruiz Forns</a>"; ?>
    <?php echo $I18N->msg( 'credits', [ 'variables' => [ $MusikAnimal, $Kaldari, $MarcelRuizForns ], 'parsemag' => true ] );; ?>
  </span>
  <div>
    <span class="nowrap">
      <?php $heart = "<span class='heart'>&hearts;</span>"; ?>
      <?php $host = "<a href='https://wikitech.wikimedia.org/wiki/Portal:Tool_Labs'>" . $I18N->msg( 'tool-labs' ) . "</a>"; ?>
      <?php echo $I18N->msg( 'hosted', [ 'variables' => [ $heart, $host ], 'parsemag' => true ] );; ?>
    </span>
    <span class="nowrap">
      <?php $translateWiki = "<a href='https://translatewiki.net/'>translatewiki.net</a>"; ?>
      <?php $jqueryI18n = "<a href='https://github.com/wikimedia/jquery.i18n'>jQuery.i18n</a>"; ?>
      <?php $intuition = "<a href='https://tools.wmflabs.org/intuition/#tab-about'>Intuition</a>"; ?>
      <?php echo $I18N->msg( 'translation-credits', [ 'variables' => [ $translateWiki, $jqueryI18n, $intuition ], 'parsemag' => true ] ); ?>
    </span>
  </div>
  <div>
    <?php if ( $currentApp !== 'metaviews' ) { ?>
      <a href="/<?php echo $currentApp; ?>/faq"><?php echo $I18N->msg( 'faq' ); ?></a>
      &middot;
      <a href="/<?php echo $currentApp; ?>/url_structure"><?php echo $I18N->msg( 'url-structure' ); ?></a>
      &middot;
    <?php } ?>
    <a href="https://github.com/MusikAnimal/pageviews"><?php echo $I18N->msg( 'view-source' ); ?></a>
    &middot;
    <a href="https://meta.wikimedia.org/wiki/Talk:Pageviews_Analysis"><?php echo $I18N->msg( 'report-issue' ); ?></a>
  </div>
</footer>
<?php if ( strpos( $_SERVER['PHP_SELF'], 'faq' ) !== false ) { ?>
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

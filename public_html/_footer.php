<div id="ad_blocker_notice" style="display:none">
  <div class="alert alert-danger alert-dismissable">
    <button class="close" type="button" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">
        &times;
      </span>
    </button>
    <div class="text-center">
      <strong><?php echo $I18N->msg( 'adblock-error-title' ); ?></strong>
      <?php echo $I18N->msg( 'adblock-error-body1' ); ?>
      <br>
      <?php echo $I18N->msg( 'adblock-error-body2' ); ?>
    </div>
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
    document.querySelector('.site-header').innerHTML = noticeContent.innerHTML + document.querySelector('.site-header').innerHTML;
  }
  
//]]>
</script>

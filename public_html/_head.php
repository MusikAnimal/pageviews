<?php
   // Return all languages available
   function getAvailableLangs() {
     global $I18N;
  
     $messageFiles = glob( ROOTDIR . '/messages/*.json' );
  
     $languages = array_values( array_unique( array_map(
       function ( $filename ) {
         return basename( $filename, '.json' );
       },
       $messageFiles
     ) ) );
  
     $availableLanguages = array();
     foreach ( $languages as $lang ) {
       $availableLanguages[$lang] = $I18N->getLangName( $lang );
     }
     ksort( $availableLanguages );
     return $availableLanguages;
   }
  
   require_once __DIR__ . '/../config.php';
   require_once ROOTDIR . '/vendor/krinkle/intuition/ToolStart.php';
   $I18N = new Intuition( 'pageviews' );
   $I18N->registerDomain( 'pageviews', ROOTDIR . '/messages' );
   $langs = getAvailableLangs();
   $currentLang = in_array($I18N->getLangName(), $langs) ? $I18N->getLangName() : 'English';
  
?>
<meta charset="utf-8">
<meta content="yes" name="apple-mobile-web-app-capable">
<meta content="black-translucent" name="apple-mobile-web-app-status-bar-style">
<meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" name="viewport">
<link rel="shortcut icon" sizes="16x16 32x32 48x48 96x96" href="/pageviews/images/favicon.ico?v=2">
<script type="text/javascript">
//<![CDATA[
   var i18nMessages = {
     apiError: "<?php echo $I18N->msg( 'api-error' ); ?>",
     apiErrorContact: "<?php echo $I18N->msg( 'api-error-contact' ); ?>",
     apiErrorNoData: "<?php echo $I18N->msg( 'api-error-no-data' ); ?>",
     apply: "<?php echo $I18N->msg( 'apply' ); ?>",
     cancel: "<?php echo $I18N->msg( 'cancel' ); ?>",
     customRange: "<?php echo $I18N->msg( 'custom-range' ); ?>",
     'last-week': "<?php echo $I18N->msg( 'last-week' ); ?>",
     'this-month': "<?php echo $I18N->msg( 'this-month' ); ?>",
     'last-month': "<?php echo $I18N->msg( 'last-month' ); ?>",
     articlePlaceholder: "<?php echo $I18N->msg( 'article-placeholder' ); ?>",
     dateNotice: "<?php echo $I18N->msg( 'date-notice', array( 'variables' => array( $I18N->msg( 'title' ), "<a href='http://stats.grok.se' target='_blank'>stats.grok.se</a>" ) ) ); ?>",
     invalidParams: "<?php echo $I18N->msg( 'invalid-params' ); ?>",
     invalidWikiURL: "<?php echo $I18N->msg( 'invalid-wiki-url' ); ?>",
     paramError1: "<?php echo $I18N->msg( 'param-error-1' ); ?>",
     paramError2: "<?php echo $I18N->msg( 'param-error-2' ); ?>",
     paramError3: "<?php echo $I18N->msg( 'param-error-3' ); ?>",
     totals: "<?php echo $I18N->msg( 'totals' ); ?>",
     day:  "<?php echo $I18N->msg( 'day' ); ?>",
     su: "<?php echo $I18N->msg( 'su' ); ?>",
     mo: "<?php echo $I18N->msg( 'mo' ); ?>",
     tu: "<?php echo $I18N->msg( 'tu' ); ?>",
     we: "<?php echo $I18N->msg( 'we' ); ?>",
     th: "<?php echo $I18N->msg( 'th' ); ?>",
     fr: "<?php echo $I18N->msg( 'fr' ); ?>",
     sa: "<?php echo $I18N->msg( 'sa' ); ?>",
     january: "<?php echo $I18N->msg( 'january' ); ?>",
     february: "<?php echo $I18N->msg( 'february' ); ?>",
     march: "<?php echo $I18N->msg( 'march' ); ?>",
     april: "<?php echo $I18N->msg( 'april' ); ?>",
     may: "<?php echo $I18N->msg( 'may' ); ?>",
     june: "<?php echo $I18N->msg( 'june' ); ?>",
     july: "<?php echo $I18N->msg( 'july' ); ?>",
     august: "<?php echo $I18N->msg( 'august' ); ?>",
     september: "<?php echo $I18N->msg( 'september' ); ?>",
     october: "<?php echo $I18N->msg( 'october' ); ?>",
     november: "<?php echo $I18N->msg( 'november' ); ?>",
     december: "<?php echo $I18N->msg( 'december' ); ?>",
     select2MinChars: "<?php echo $I18N->msg( 'select2-min-chars', array( 'variables' => array( 'replace me' ) ) ); ?>",
     select2MaxChars: "<?php echo $I18N->msg( 'select2-max-chars', array( 'variables' => array( 'replace me' ) ) ); ?>",
     select2Loading: "<?php echo $I18N->msg( 'select2-loading' ); ?>",
     select2MaxItems: "<?php echo $I18N->msg( 'select2-max-items', array( 'variables' => array( 'replace me' ) ) ); ?>",
     select2NoResults: "<?php echo $I18N->msg( 'select2-no-results' ); ?>",
     select2Searching: "<?php echo $I18N->msg( 'select2-searching' ); ?>",
     hoverToExclude: "<?php echo $I18N->msg( 'hover-to-exclude' ); ?>",
     numLanguages: "<?php echo $I18N->msg( 'num-languages', array( 'variables' => array( 'i18n-arg' ) ) ); ?>",
     uniqueTitles: "<?php echo $I18N->msg( 'unique-titles', array( 'variables' => array( 'i18n-arg' ) ) ); ?>",
     invalidProject: "<?php echo $I18N->msg( 'invalid-project', array( 'variables' => array( 'i18n-arg' ) ) ); ?>",
     invalidLangProject: "<?php echo $I18N->msg( 'invalid-lang-project', array( 'variables' => array( 'i18n-arg' ) ) ); ?>",
     wikidataError: "<?php echo $I18N->msg( 'wikidata-error' ); ?>",
     wikidataErrorUnknown: "<?php echo $I18N->msg( 'wikidata-error-unknown' ); ?>",
     langviewsError: "<?php echo $I18N->msg( 'langviews-error', array( 'variables' => array( 'i18n-arg' ) ) ); ?>"
   };
  
//]]>
</script>
<script src="application.js"></script>
<script src="/pageviews/ad_block_test.js"></script>
<link href="application.css" rel="stylesheet">
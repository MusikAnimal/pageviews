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
       $availableLanguages[$lang] = ucfirst( $I18N->getLangName( $lang ) );
     }
     asort( $availableLanguages );
     return $availableLanguages;
   }
  
   require_once __DIR__ . '/../config.php';
   require_once ROOTDIR . '/vendor/krinkle/intuition/ToolStart.php';
   require_once ROOTDIR . '/vendor/whichbrowser/parser/bootstrap.php';
   $I18N = new Intuition( 'pageviews' );
   $I18N->registerDomain( 'pageviews', ROOTDIR . '/messages' );
   $langs = getAvailableLangs();
   $currentLang = in_array( $I18N->getLangName(), $langs ) ? $I18N->getLangName() : 'English';
   $client = new WhichBrowser\Parser(getallheaders());
   $defaultMsg = '(' . strtolower( $I18N->msg( 'default' ) ) . ')';
  
   function generateListMessage( $values ) {
     global $I18N;
     $comma = $I18N->msg( 'comma-character' ) . ' ';
     return $I18N->msg( 'list-values', [
       'variables' => [ implode( $values, $comma ), count( $values ) ], 'parsemag' => true
     ] );
   }
  
   // Adds a .rtl class to the <body> if a right-to-left language
   if ( in_array( $I18N->getLang(), array( 'ar', 'he', 'fa', 'ps', 'ur' ) ) ) {
     $rtl = 'rtl';
   } else {
     $rtl = '';
   }
  
?>
<script type="text/javascript">
//<![CDATA[
   i18nLang = "<?php echo $I18N->getLang(); ?>";
   i18nRtl = "<?php echo $rtl; ?>";
   metaRoot = "<?php echo METAROOT; ?>";
  
//]]>
</script>
<meta charset="utf-8">
<meta content="yes" name="apple-mobile-web-app-capable">
<meta content="black-translucent" name="apple-mobile-web-app-status-bar-style">
<meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" name="viewport">
<link rel="shortcut icon" sizes="16x16 32x32 48x48 96x96" href="/pageviews/images/favicon.ico?v=2">
<script src="application.js"></script>
<script src="/pageviews/ad_block_test.js"></script>
<link href="application.css" rel="stylesheet">
<script type="text/javascript">
//<![CDATA[
   // language selector
   $(document).ready(function() {
     $('.lang-link').on('click', function(e) {
       e.preventDefault();
       var expiryGMT = moment().add(30, 'days').toDate().toGMTString();
       document.cookie = 'TsIntuition_userlang=' + $(e.target).data('lang') + '; expires=' + expiryGMT + '; path=/';
  
       var expiryUnix = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
       document.cookie = 'TsIntuition_expiry=' + expiryUnix + '; expires=' + expiryGMT + '; path=/';
       location.reload();
     });
   });
  
//]]>
</script>

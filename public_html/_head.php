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
  
     $availableLanguages = [];
     foreach ( $languages as $lang ) {
       $availableLanguages[$lang] = ucfirst( $I18N->getLangName( $lang ) );
     }
     asort( $availableLanguages );
     return $availableLanguages;
   }
  
   require_once ROOTDIR . '/vendor/autoload.php';
   $I18N = new Intuition( 'pageviews' );
   $I18N->registerDomain( 'pageviews', ROOTDIR . '/messages' );
   $langs = getAvailableLangs();
  
   if ( isset( $_GET['uselang'] ) ) {
     $I18N->setLang( $_GET['uselang'] );
   }
  
   $currentLang = in_array( $I18N->getLang(), array_keys( $langs ) ) ? $langs[$I18N->getLang()] : 'English';
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
   $rtl = $I18N->isRtl( $I18N->getLang() ) ? 'rtl' : '';
  
   // Get the file names for the assets.
   // This uses the development files if present, otherwise what's specified by rev-manifest.json.
   $assetPath = ROOTDIR . "/public_html/$currentApp";
   $manifest = json_decode( file_get_contents( "$assetPath/rev-manifest.json" ), true );
   if ( file_exists( "$assetPath/application.js" ) ) {
     $jsFile = 'application.js';
   } else {
     $jsFile = $manifest['application.js'];
   }
   if ( file_exists( "$assetPath/application.css" ) ) {
     $cssFile = 'application.css';
   } else {
     $cssFile = $manifest['application.css'];
   }
  
?>
<script type="text/javascript">
//<![CDATA[
   i18nLang = "<?php echo $I18N->getLang(); ?>";
   i18nRtl = "<?php echo $rtl; ?>";
   appPath = "<?php echo BASE_PATH; ?>";
   currentApp = "<?php echo $currentApp; ?>";
  
//]]>
</script>
<meta charset="utf-8">
<meta content="yes" name="apple-mobile-web-app-capable">
<meta content="black-translucent" name="apple-mobile-web-app-status-bar-style">
<meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" name="viewport">
<link rel="shortcut icon" sizes="16x16 32x32 48x48 96x96" href="images/favicon.ico?v=3">
<script src="<?php echo BASE_PATH; ?>/<?php echo $currentApp; ?><?php echo $appSuffix; ?>/<?php echo $jsFile; ?>"></script>
<script src="<?php echo BASE_PATH; ?>/<?php echo $currentApp; ?><?php echo $appSuffix; ?>/ad_block_test.js"></script>
<link href="<?php echo BASE_PATH; ?>/<?php echo $currentApp; ?><?php echo $appSuffix; ?>/<?php echo $cssFile; ?>" rel="stylesheet">
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

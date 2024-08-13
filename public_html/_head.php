<?php
require_once ROOTDIR . '/vendor/autoload.php';

// Return all languages available
function getAvailableLangs(): array {
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

$I18N = new Intuition( 'pageviews' );
$I18N->registerDomain( 'pageviews', ROOTDIR . '/messages' );
$langs = getAvailableLangs();

if ( isset( $_GET['uselang'] ) ) {
	$I18N->setLang( $_GET['uselang'] );
}

$currentLang = in_array( $I18N->getLang(), array_keys( $langs ) ) ? $langs[$I18N->getLang()] : 'English';
$defaultMsg = '(' . strtolower( $I18N->msg( 'default' ) ) . ')';

function generateListMessage( $values ) {
	global $I18N;
	$comma = $I18N->msg( 'comma-character' ) . ' ';
	return $I18N->msg( 'list-values', [
		'variables' => [ implode( $comma, $values ), count( $values ) ], 'parsemag' => true
	] );
}

// Adds a .rtl class to the <body> if a right-to-left language
$rtl = $I18N->isRtl( $I18N->getLang() ) ? 'rtl' : '';
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
<link rel="shortcut icon" sizes="16x16 32x32 48x48 96x96" href="/images/favicon.ico?v=3">
<script src="/<?php echo $currentApp; ?>/application.js"></script>
<script src="/ad_block_test.js"></script>
<link href="/<?php echo $currentApp; ?>/application.css" rel="stylesheet">

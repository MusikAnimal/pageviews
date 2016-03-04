<?php require_once __DIR__ . '/../config.php'; ?>
<?php require_once ROOTDIR . '/vendor/krinkle/intuition/ToolStart.php'; ?>
<?php $I18N = new Intuition( 'pageviews' ); ?>
<?php $I18N->registerDomain( 'pageviews', ROOTDIR . '/messages' ); ?>
<meta charset="utf-8">
<meta content="yes" name="apple-mobile-web-app-capable">
<meta content="black-translucent" name="apple-mobile-web-app-status-bar-style">
<meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" name="viewport">
<script type="text/javascript">
//<![CDATA[
   var i18nMessages = {
     apply: "<?php echo $I18N->msg( 'apply' ); ?>",
     cancel: "<?php echo $I18N->msg( 'cancel' ); ?>",
     articlePlaceholder: "<?php echo $I18N->msg( 'article-placeholder' ); ?>",
     dateNotice: "<?php echo $I18N->msg( 'date-notice', array( 'variables' => array( $I18N->msg( 'title' ), "<a href='http://stats.grok.se' target='_blank'>stats.grok.se</a>" ) ) ); ?>",
     invalidParams: "<?php echo $I18N->msg( 'invalid-params' ); ?>",
     paramError1: "<?php echo $I18N->msg( 'param-error-1' ); ?>",
     paramError1: "<?php echo $I18N->msg( 'param-error-2' ); ?>",
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
     select2Searching: "<?php echo $I18N->msg( 'select2-searching' ); ?>"
   };
  
  
//]]>
</script>
<script src="application.js"></script>
<link href="application.css" rel="stylesheet">
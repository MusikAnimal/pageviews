<?php
  require_once __DIR__ . '/../config.php';
  require_once ROOTDIR . '/vendor/autoload.php';
  $I18N = new Intuition( 'pageviews' );
  $I18N->registerDomain( 'pageviews', ROOTDIR . '/messages' );
?>
<meta charset="utf-8"/>
<meta content="yes" name="apple-mobile-web-app-capable"/>
<meta content="black-translucent" name="apple-mobile-web-app-status-bar-style"/>
<meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" name="viewport"/>
<script type="text/javascript">
var i18nMessages = {
  apply: "<?= $I18N->msg( 'apply' ) ?>",
  cancel: "<?= $I18N->msg( 'cancel' ) ?>",
  articlePlaceholder: "<?= $I18N->msg( 'article-placeholder' ) ?>",
  dateNotice: "<?= $I18N->msg( 'date-notice', array( 'variables' => array( $I18N->msg( 'title' ), "<a href='http://stats.grok.se' target='_blank'>stats.grok.se</a>" ) ) ) ?>",
  invalidParams: "<?= $I18N->msg( 'invalid-params' ) ?>",
  paramError1: "<?= $I18N->msg( 'param-error-1' ) ?>",
  paramError1: "<?= $I18N->msg( 'param-error-2' ) ?>",
  totals: "<?= $I18N->msg( 'totals' ) ?>",
  day:  "<?= $I18N->msg( 'day' ) ?>",
  su: "<?= $I18N->msg( 'su' ) ?>",
  mo: "<?= $I18N->msg( 'mo' ) ?>",
  tu: "<?= $I18N->msg( 'tu' ) ?>",
  we: "<?= $I18N->msg( 'we' ) ?>",
  th: "<?= $I18N->msg( 'th' ) ?>",
  fr: "<?= $I18N->msg( 'fr' ) ?>",
  sa: "<?= $I18N->msg( 'sa' ) ?>",
  january: "<?= $I18N->msg( 'january' ) ?>",
  february: "<?= $I18N->msg( 'february' ) ?>",
  march: "<?= $I18N->msg( 'march' ) ?>",
  april: "<?= $I18N->msg( 'april' ) ?>",
  may: "<?= $I18N->msg( 'may' ) ?>",
  june: "<?= $I18N->msg( 'june' ) ?>",
  july: "<?= $I18N->msg( 'july' ) ?>",
  august: "<?= $I18N->msg( 'august' ) ?>",
  september: "<?= $I18N->msg( 'september' ) ?>",
  october: "<?= $I18N->msg( 'october' ) ?>",
  november: "<?= $I18N->msg( 'november' ) ?>",
  december: "<?= $I18N->msg( 'december' ) ?>",
  select2MinChars: "<?= $I18N->msg( 'select2-min-chars', array( 'variables' => array( 'replace me' ) ) ) ?>",
  select2MaxChars: "<?= $I18N->msg( 'select2-max-chars', array( 'variables' => array( 'replace me' ) ) ) ?>",
  select2Loading: "<?= $I18N->msg( 'select2-loading' ) ?>",
  select2MaxItems: "<?= $I18N->msg( 'select2-max-items', array( 'variables' => array( 'replace me' ) ) ) ?>",
  select2NoResults: "<?= $I18N->msg( 'select2-no-results' ) ?>",
  select2Searching: "<?= $I18N->msg( 'select2-searching' ) ?>"
};
</script>

<script src="application.js"></script>
<link href="application.css" rel="stylesheet"></link>

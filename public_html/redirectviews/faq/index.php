<?php require_once __DIR__ . '/../../../config.php'; ?>
<?php $currentApp = 'redirectviews'; ?>
<?php $appSuffix .= '/faq'; ?>
<!DOCTYPE html>
<html>
  <head>
    <?php include '../../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'redirectviews-title' ) . ' - ' . $I18N->msg( 'faq' ); ?>
    </title>
  </head>
  <body class="<?php echo $rtl; ?>">
    <?php $currentApp = 'redirectviews'; ?>
    <?php include '../../_header.php'; ?>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'redirectviews-title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'faq' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <ul class="list-group">
          <?php include "../../faq_parts/_redirects.php"; ?>
          <?php include "../../faq_parts/_old_data.php"; ?>
          <?php include "../../faq_parts/_todays_data.php"; ?>
          <?php include "../../faq_parts/_counts.php"; ?>
          <?php include "../../faq_parts/_location.php"; ?>
          <?php include "../../faq_parts/_referrals.php"; ?>
          <?php include "../../faq_parts/_date_dot.php"; ?>
          <?php include "../../faq_parts/_agents.php"; ?>
          <?php include "../../faq_parts/_feedback.php"; ?>
        </ul>
        <div class="col-lg-12 text-center tm">
          <a href="/redirectviews">
            <?php echo $I18N->msg( 'faq-return-to', array( 'variables' => array( $I18N->msg( 'redirectviews-title' ) ), 'parsemag' => true ) ); ?>
          </a>
        </div>
      </main>
      <?php include "../../_footer.php"; ?>
    </div>
  </body>
</html>

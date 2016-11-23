<!DOCTYPE html>
<html>
  <head>
    <?php include '../../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'userviews-title' ) . ' - ' . $I18N->msg( 'faq' ); ?>
    </title>
  </head>
  <body class="<?php echo $rtl; ?>">
    <?php $currentApp = 'userviews'; ?>
    <?php include '../../_header.php'; ?>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'userviews-title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'faq' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <ul class="list-group">
          <?php include "../../faq_parts/_old_data.php"; ?>
          <?php include "../../faq_parts/_todays_data.php"; ?>
          <?php include "../../faq_parts/_agents.php"; ?>
          <?php include "../../faq_parts/_feedback.php"; ?>
        </ul>
        <div class="col-lg-12 text-center tm">
          <a href="/userviews">
            <?php echo $I18N->msg( 'faq-return-to', array( 'variables' => array( $I18N->msg( 'userviews-title' ) ), 'parsemag' => true ) ); ?>
          </a>
        </div>
      </main>
      <?php include "../../_footer.php"; ?>
    </div>
  </body>
</html>

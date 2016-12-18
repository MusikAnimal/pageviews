<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'title' ) . ' - ' . $I18N->msg( 'faq' ); ?>
    </title>
  </head>
  <body class="<?php echo $rtl; ?>">
    <?php $currentApp = 'pageviews'; ?>
    <?php include '../_header.php'; ?>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'faq' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <ul class="list-group">
          <?php include "../faq_parts/_old_data.php"; ?>
          <?php include "../faq_parts/_todays_data.php"; ?>
          <?php include "../faq_parts/_search_redirects.php"; ?>
          <?php include "../faq_parts/_redirects.php"; ?>
          <?php include "../faq_parts/_counts.php"; ?>
          <?php include "../faq_parts/_location.php"; ?>
          <?php include "../faq_parts/_referrals.php"; ?>
          <?php include "../faq_parts/_agents.php"; ?>
          <?php include "../faq_parts/_chart_type.php"; ?>
          <li class="list-group-item">
            <p>
              <strong><?php echo $I18N->msg( 'faq-top-viewed-title' ); ?></strong>
            </p>
            <p>
              <?php echo $I18N->msg( 'faq-try-tool', array( 'variables' => array( "<a href='/topviews'>" . $I18N->msg( 'topviews-title' ) . "</a>" ), 'parsemag' => true ) ); ?>
            </p>
          </li>
          <li class="list-group-item">
            <p>
              <strong><?php echo $I18N->msg( 'faq-multi-lang-title' ); ?></strong>
            </p>
            <p>
              <?php echo $I18N->msg( 'faq-try-tool', array( 'variables' => array( "<a href='/langviews'>" . $I18N->msg( 'langviews-title' ) . "</a>" ), 'parsemag' => true ) ); ?>
            </p>
          </li>
          <?php include "../faq_parts/_feedback.php"; ?>
        </ul>
        <div class="col-lg-12 text-center tm">
          <a href="/pageviews">
            <?php echo $I18N->msg( 'faq-return-to', array( 'variables' => array( $I18N->msg( 'title' ) ), 'parsemag' => true ) ); ?>
          </a>
        </div>
      </main>
      <?php $currentApp = "pageviews"; ?>
      <?php include "../_footer.php"; ?>
    </div>
  </body>
</html>

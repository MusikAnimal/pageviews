<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'title' ) . ' - ' . $I18N->msg( 'faq' ); ?>
    </title>
  </head>
  <body>
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
          <?php include "../faq_parts/old_data.php"; ?>
          <?php include "../faq_parts/todays_data.php"; ?>
          <?php include "../faq_parts/agents.php"; ?>
          <?php include "../faq_parts/chart_type.php"; ?>
          <li class="list-group-item">
            <p>
              <strong><?php echo $I18N->msg( 'faq-line-chart-title' ); ?></strong>
            </p>
            <p>
              <?php echo $I18N->msg( 'faq-line-chart-body' ); ?>
            </p>
          </li>
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
          <?php include "../faq_parts/feedback.php"; ?>
        </ul>
        <div class="col-lg-12 text-center tm">
          <a href="/pageviews">
            <?php echo $I18N->msg( 'faq-return-to', array( 'variables' => array( $I18N->msg( 'title' ) ), 'parsemag' => true ) ); ?>
          </a>
        </div>
        <?php $currentApp = "pageviews"; ?>
        <?php include "../_footer.php"; ?>
      </main>
    </div>
  </body>
</html>
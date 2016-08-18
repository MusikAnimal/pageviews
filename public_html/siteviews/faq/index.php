<!DOCTYPE html>
<html>
  <head>
    <?php include '../../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'siteviews-title' ) . ' - ' . $I18N->msg( 'faq' ); ?>
    </title>
  </head>
  <body>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'siteviews-title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'faq' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <ul class="list-group">
          <?php include "../../faq_parts/old_data.php"; ?>
          <?php include "../../faq_parts/todays_data.php"; ?>
          <li class="list-group-item">
            <p>
              <strong><?php echo $I18N->msg( 'faq-source-title' ); ?></strong>
            </p>
            <ul class="faq-ul">
              <li>
                <i><?php echo $I18N->msg( 'pageviews' ); ?></i>
                <?php echo $I18N->msg( 'faq-source-pageviews' ); ?>
              </li>
              <li>
                <i><?php echo $I18N->msg( 'unique-devices' ); ?></i>
                <?php echo $I18N->msg( 'faq-source-unique-devices' ); ?>
              </li>
            </ul>
          </li>
          <?php include "../../faq_parts/agents.php"; ?>
          <?php include "../../faq_parts/chart_type.php"; ?>
          <li class="list-group-item">
            <p>
              <strong><?php echo $I18N->msg( 'faq-top-viewed-title' ); ?></strong>
            </p>
            <p>
              <?php echo $I18N->msg( 'faq-try-tool', array( 'variables' => array( "<a href='/topviews'>" . $I18N->msg( 'topviews-title' ) . "</a>" ), 'parsemag' => true ) ); ?>
            </p>
          </li>
          <?php include "../../faq_parts/feedback.php"; ?>
        </ul>
        <div class="col-lg-12 text-center tm">
          <a href="/siteviews">
            <?php echo $I18N->msg( 'faq-return-to', array( 'variables' => array( $I18N->msg( 'siteviews-title' ) ), 'parsemag' => true ) ); ?>
          </a>
        </div>
        <?php $currentApp = "siteviews"; ?>
        <?php include "../../_footer.php"; ?>
      </main>
    </div>
  </body>
</html>
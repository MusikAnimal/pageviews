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
      <div class="col-lg-offset-2">
        <!-- Header -->
        <header class="row aqs-row">
          <div class="col-lg-10 text-center">
            <h4>
              <strong>
                <?php echo $I18N->msg( 'siteviews-title' ) . ' - ' . $I18N->msg( 'faq' ); ?>
              </strong>
            </h4>
          </div>
        </header>
        <div class="col-lg-10">
          <ul class="list-group">
            <li class="list-group-item">
              <?php $backfillDate = $I18N->msg( 'july' ) . ' 2015'; ?>
              <p>
                <strong><?php echo $I18N->msg( 'faq-old-data-title', array( 'variables' => array( $backfillDate ) ) ); ?></strong>
              </p>
              <p>
                <?php echo $I18N->msg( 'faq-old-data-body', array( 'variables' => array( $backfillDate ) ) ); ?>
              </p>
            </li>
            <li class="list-group-item">
              <p>
                <strong><?php echo $I18N->msg( 'faq-todays-date-title' ); ?></strong>
              </p>
              <p>
                <?php echo $I18N->msg( 'faq-todays-date-body' ); ?>
              </p>
            </li>
            <li class="list-group-item">
              <p>
                <strong><?php echo $I18N->msg( 'faq-source-title' ); ?></strong>
              </p>
              <ul class="agents-ul">
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
            <li class="list-group-item">
              <p>
                <strong><?php echo $I18N->msg( 'faq-agents-title' ); ?></strong>
              </p>
              <ul class="agents-ul">
                <li>
                  <i><?php echo $I18N->msg( 'user' ); ?></i>
                  <?php echo $I18N->msg( 'faq-agents-user' ); ?>
                </li>
                <li>
                  <i><?php echo $I18N->msg( 'spider' ); ?></i>
                  <?php echo $I18N->msg( 'faq-agents-spider' ); ?>
                </li>
                <li>
                  <i><?php echo $I18N->msg( 'bot' ); ?></i>
                  <?php echo $I18N->msg( 'faq-agents-bot' ); ?>
                </li>
              </ul>
            </li>
            <li class="list-group-item">
              <p>
                <strong><?php echo $I18N->msg( 'faq-chart-type-title' ); ?></strong>
              </p>
              <p>
                <?php echo $I18N->msg( 'faq-chart-type-body' ); ?>
              </p>
            </li>
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
                <strong><?php echo $I18N->msg( 'faq-bug-report-title' ); ?></strong>
              </p>
              <p>
                <?php echo $I18N->msg( 'faq-bug-report-body' ); ?>
              </p>
            </li>
          </ul>
        </div>
        <div class="col-lg-10 text-center tm">
          <a href="/siteviews">
            <?php echo $I18N->msg( 'faq-return-to', array( 'variables' => array( $I18N->msg( 'siteviews-title' ) ), 'parsemag' => true ) ); ?>
          </a>
        </div>
        <?php $currentApp = "siteviews"; ?>
        <?php include "../../_footer.php"; ?>
      </div>
    </div>
  </body>
</html>
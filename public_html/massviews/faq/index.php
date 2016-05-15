<!DOCTYPE html>
<html>
  <head>
    <?php include '../../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'massviews-title' ) . ' - ' . $I18N->msg( 'faq' ); ?>
    </title>
  </head>
  <body>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'massviews-title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'faq' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <ul class="list-group">
          <li class="list-group-item">
            <p>
              <strong><?php echo $I18N->msg( 'faq-throttle-wait-title', array( 'variables' => array( 90 ) ) ); ?></strong>
            </p>
            <p>
              <?php echo $I18N->msg( 'faq-throttle-wait-body', array( 'variables' => array( 90 ) ) ); ?>
            </p>
          </li>
          <li class="list-group-item">
            <p>
              <strong><?php echo $I18N->msg( 'faq-page-pile-title' ); ?></strong>
            </p>
            <p>
              <?php $pagePileLink = "<a href='//tools.wmflabs.org/pagepile' target='_blank'>Page Pile</a>"; ?>
              <?php echo $I18N->msg( 'faq-page-pile-body', array( 'variables' => array( $pagePileLink ) ) ); ?>
            </p>
          </li>
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
              <strong><?php echo $I18N->msg( 'faq-bug-report-title' ); ?></strong>
            </p>
            <p>
              <?php echo $I18N->msg( 'faq-bug-report-body' ); ?>
            </p>
          </li>
        </ul>
        <div class="col-lg-12 text-center tm">
          <a href="/massviews">
            <?php echo $I18N->msg( 'faq-return-to', array( 'variables' => array( $I18N->msg( 'massviews-title' ) ), 'parsemag' => true ) ); ?>
          </a>
        </div>
        <?php $currentApp = "massviews"; ?>
        <?php include "../../_footer.php"; ?>
      </main>
    </div>
  </body>
</html>
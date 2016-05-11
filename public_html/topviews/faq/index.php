<!DOCTYPE html>
<html>
  <head>
    <?php include "../../_head.php"; ?>
    <title>
      <?php echo $I18N->msg( 'topviews-title' ) . ' - ' . $I18N->msg( 'faq' ); ?>
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
                <?php echo $I18N->msg( 'topviews-title' ) . ' - ' . $I18N->msg( 'faq' ); ?>
              </strong>
            </h4>
          </div>
        </header>
        <div class="col-lg-10">
          <ul class="list-group">
            <li class="list-group-item" id="data_caveat">
              <p>
                <strong>
                  <?php echo $I18N->msg( 'faq-topviews-data-approx-title'); ?>
                </strong>
              </p>
              <p>
                <?php $restBaseLink = "<a href='https://wikimedia.org/api/rest_v1/?doc#/'>Wikimedia Pageviews API</a>"; ?>
                <?php echo $I18N->msg( 'faq-topviews-data-approx-body', array( 'variables' => array( $restBaseLink ) ) ); ?>
              </p>
            </li>
            <li class="list-group-item" id="false_positive">
              <p>
                <strong>
                  <?php echo $I18N->msg( 'faq-topviews-false-positive-title'); ?>
                </strong>
              </p>
              <p>
                <?php echo $I18N->msg( 'faq-topviews-false-positive-body1'); ?>
              </p>
              <p>
                <?php echo $I18N->msg( 'faq-topviews-false-positive-body2'); ?>
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
                <strong><?php echo $I18N->msg( 'faq-bug-report-title' ); ?></strong>
              </p>
              <p>
                <?php echo $I18N->msg( 'faq-bug-report-body' ); ?>
              </p>
            </li>
          </ul>
        </div>
        <div class="col-lg-10 text-center tm">
          <a href="/topviews">
            <?php echo $I18N->msg( 'faq-return-to', array( 'variables' => array( $I18N->msg( 'topviews-title' ) ), 'parsemag' => true ) ); ?>
          </a>
        </div>
        <?php $currentApp = "topviews"; ?>
        <?php include "../../_footer.php"; ?>
      </div>
    </div>
  </body>
  <script type="text/javascript">
  //<![CDATA[
    if (location.hash) $(location.hash).addClass('flash');
    
  //]]>
  </script>
</html>
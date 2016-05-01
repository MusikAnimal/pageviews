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
            <li class="list-group-item">
              <p>
                <strong><?php echo $I18N->msg( 'faq-old-data-title' ); ?></strong>
              </p>
              <p>
                <?php echo $I18N->msg( 'faq-old-data-body' ); ?>
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
        <div class="col-lg-10 text-center">
          <a href="/topviews">
            <?php echo $I18N->msg( 'faq-return-to', array( 'variables' => array( $I18N->msg( 'topviews-title' ) ), 'parsemag' => true ) ); ?>
          </a>
        </div>
        <?php $app = "topviews"; ?>
        <?php include "../../_footer.php"; ?>
      </div>
    </div>
  </body>
</html>
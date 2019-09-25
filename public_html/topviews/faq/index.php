<?php require_once __DIR__ . '/../../../config.php'; ?>
<?php $currentApp = 'topviews'; ?>
<!DOCTYPE html>
<html>
  <head>
    <?php include "../../_head.php"; ?>
    <title>
      <?php echo $I18N->msg( 'topviews-title' ) . ' - ' . $I18N->msg( 'faq' ); ?>
    </title>
  </head>
  <body class="<?php echo $rtl; ?>">
    <?php include '../../_header.php'; ?>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'topviews-title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'faq' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <ul class="list-group">
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
              <?php echo $I18N->msg( 'faq-topviews-false-positive-body4', [ 'variables' => [ $I18N->msg( 'show-mobile-percentages' ), $I18N->msg( 'platform' ), $I18N->msg( 'all' ) ] ] ); ?>
            </p>
            <p>
              <?php echo $I18N->msg( 'faq-topviews-false-positive-body3', [ 'variables' => [ $I18N->msg( 'topviews' ), $I18N->msg( 'report-false-positive' ), $I18N->msg( 'excluded-pages' ) ] ] ); ?>
            </p>
            <p>
              <?php echo $I18N->msg( 'faq-topviews-false-positive-body2'); ?>
            </p>
          </li>
          <?php include "../../faq_parts/_old_data.php"; ?>
          <?php include "../../faq_parts/_todays_data.php"; ?>
          <?php include "../../faq_parts/_counts.php"; ?>
          <?php include "../../faq_parts/_feedback.php"; ?>
        </ul>
        <div class="col-lg-12 text-center tm">
          <a href="/topviews">
            <?php echo $I18N->msg( 'faq-return-to', [ 'variables' => [ $I18N->msg( 'topviews-title' ) ], 'parsemag' => true ] ); ?>
          </a>
        </div>
      </main>
      <?php include "../../_footer.php"; ?>
    </div>
  </body>
</html>

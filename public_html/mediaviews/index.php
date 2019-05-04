<!-- Mediaviews Analysis tool -->
<!-- Copyright 2016-2018 MusikAnimal -->
<?php require_once __DIR__ . '/../../config.php'; ?>
<?php $currentApp = 'mediaviews'; ?>
<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title><?php echo $I18N->msg( 'mediaviews-title' ); ?></title>
  </head>
  <body class="clearfix <?php echo $rtl; ?> <?php echo $currentApp; ?>">
    <?php include '../_header.php'; ?>
    <main class="col-lg-12">
      <div class="text-center text-danger" style="margin-top:50px; font-size:125%">
        <p>
          Mediaviews has temporarily been
          <strong>
            retired
          </strong>
          due to technical challenges.
        </p>
        <p>
          A long-term solution is tracked at
          <a href="https://phabricator.wikimedia.org/T207208" target="_blank">T207208</a> and
          <a href="https://phabricator.wikimedia.org/T210313" target="_blank">T210313</a>.
          <br>
          If you have a Phabricator account, feel free to award a token to encourage progress.
        </p>
        <p>
          Apologies for the inconvenience.
        </p>
      </div>
    </main>
    <?php include '../_footer.php'; ?>
    <?php include '../_modals.php'; ?>
  </body>
</html>

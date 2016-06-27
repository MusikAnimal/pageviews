<!DOCTYPE html>
<html>
  <head>
    <?php include '../../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'siteviews-title' ) . ' – ' . $I18N->msg( 'url-structure' ); ?>
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
            <?php echo $I18N->msg( 'url-structure' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <div>
          <?php $siteviewsLink = "<pre>//tools.wmflabs.org/siteviews#sites={{SERVERNAME}}</pre>"; ?>
          <?php echo $I18N->msg( 'url-structure-example-siteviews', array( 'variables' => array( $siteviewsLink ), 'parsemag' => true ) ); ?>
        </div>
        <div>
          <h3>
            <?php echo $I18N->msg( 'url-structure-parameters' ); ?>
            <small><?php echo $I18N->msg( 'url-structure-parameters-order' ); ?></small>
          </h3>
          <hr>
          <dl class="dl-horizontal">
            <dt>sites</dt>
            <dd>
              <?php $sitematrixLink = "<a href='https://meta.wikimedia.org/w/api.php?action=sitematrix&amp;formatversion=2'>" . strtolower( $I18N->msg( 'projects' ) ) . "</a>"; ?>
              <?php echo $I18N->msg( 'url-structure-projects', array( 'variables' => array( $sitematrixLink, '<code>de.wikipedia.org|fr.wikipedia.org</code>' ), 'parsemag' => true ) ); ?>
            </dd>
            <?php $defaultRange = 'latest'; ?>
            <?php include "../../url_parts/date_ranges.php"; ?>
            <dt>source</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-source', array( 'variables' => array( '<code>pageviews</code>', '<code>unique-devices</code>' ), 'parsemag' => true ) ); ?>
            </dd>
            <?php include "../../url_parts/platform.php"; ?>
            <?php include "../../url_parts/agent.php"; ?>
          </dl>
        </div>
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
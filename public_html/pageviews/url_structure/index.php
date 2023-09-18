<?php require_once __DIR__ . '/../../../config.php'; ?>
<?php $currentApp = 'pageviews'; ?>
<!DOCTYPE html>
<html>
  <head>
    <?php include '../../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'title' ) . ' – ' . $I18N->msg( 'url-structure' ); ?>
    </title>
  </head>
  <body class="<?php echo $rtl; ?>">
    <?php include '../../_header.php'; ?>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'url-structure' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <div>
          <?php $pageviewsLink = "<pre dir='ltr' class='url-structure-example'>https://pageviews.toolforge.org/?project=en.wikipedia.org&amp;pages={{FULLPAGENAMEE}}</pre>"; ?>
          <?php $project = "<code>en.wikipedia.org</code>"; ?>
          <?php $sitematrixLink = "<a href='https://gerrit.wikimedia.org/r/plugins/gitiles/analytics/refinery/+/refs/heads/master/static_data/pageview/allowlist/allowlist.tsv'>" . strtolower( $I18N->msg( 'project' ) ) . "</a>"; ?>
          <?php $fullpageNamee = "<code>{{FULLPAGENAMEE}}</code>"; ?>
          <?php echo $I18N->msg( 'url-structure-example', [ 'variables' => [ $pageviewsLink, $project, $sitematrixLink, $fullpageNamee ], 'parsemag' => true ] ); ?>
        </div>
        <div>
          <h3>
            <?php echo $I18N->msg( 'url-structure-parameters' ); ?>
            <small><?php echo $I18N->msg( 'url-structure-parameters-order' ); ?></small>
          </h3>
          <hr>
          <dl class="dl-horizontal">
            <?php include "../../url_parts/_project.php"; ?>
            <dt>pages</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-pages' ); ?>
              <br>
              <?php echo $I18N->msg( 'url-structure-onwiki-link', [ 'variables' => [ $fullpageNamee ], 'parsemag' => true ] ); ?>
            </dd>
            <?php $defaultRange = 'latest'; ?>
            <?php include "../../url_parts/_date_ranges.php"; ?>
            <?php include "../../url_parts/_platform.php"; ?>
            <?php include "../../url_parts/_agent.php"; ?>
            <?php include "../../url_parts/_redirects.php"; ?>
            <?php include "../../url_parts/_autolog.php"; ?>
            <?php include "../../url_parts/_mute_validations.php"; ?>
          </dl>
        </div>
        <div class="col-lg-12 text-center tm">
          <a href="/">
            <?php echo $I18N->msg( 'faq-return-to', [ 'variables' => [ $I18N->msg( 'title' ) ], 'parsemag' => true ] ); ?>
          </a>
        </div>
      </main>
      <?php include "../../_footer.php"; ?>
    </div>
  </body>
</html>

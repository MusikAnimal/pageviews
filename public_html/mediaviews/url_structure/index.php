<?php require_once __DIR__ . '/../../../config.php'; ?>
<?php $currentApp = 'mediaviews'; ?>
<!DOCTYPE html>
<html>
  <head>
    <?php include '../../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'mediaviews-title' ) . ' – ' . $I18N->msg( 'url-structure' ); ?>
    </title>
  </head>
  <body class="<?php echo $rtl; ?>">
    <?php $currentApp = 'mediaviews'; ?>
    <?php include '../../_header.php'; ?>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'mediaviews-title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'url-structure' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <div>
          <?php $mediaviewsLink = "<pre dir='ltr' class='url-structure-example'>https://pageviews.wmflabs.org/mediaviews?project=commons.wikimedia.org&files={{PAGENAMEE}}</pre>"; ?>
          <?php $fullpageNamee = "<code>{{PAGENAMEE}}</code>"; ?>
          <?php $project = "<code>commons.wikimedia.org</code>"; ?>
          <?php $sitematrixLink = "<a href='https://gerrit.wikimedia.org/r/plugins/gitiles/analytics/refinery/+/refs/heads/master/static_data/pageview/allowlist/allowlist.tsv'>" . strtolower( $I18N->msg( 'project' ) ) . "</a>"; ?>
          <?php echo $I18N->msg( 'url-structure-example', [ 'variables' => [ $mediaviewsLink, $project, $sitematrixLink, $fullpageNamee ], 'parsemag' => true ] ); ?>
        </div>
        <div>
          <h3>
            <?php echo $I18N->msg( 'url-structure-parameters' ); ?>
            <small><?php echo $I18N->msg( 'url-structure-parameters-order' ); ?></small>
          </h3>
          <hr>
          <dl class="dl-horizontal">
            <?php $defaultProject = 'commons.wikimedia.org'; ?>
            <?php include "../../url_parts/_project.php"; ?>
            <dt>files</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-files', [ 'variables' => [ '<code>Lion_cubs_(Panthera_leo).webm|Example.jpg</code>' ], 'parsemag' => true ] ); ?>
            </dd>
            <?php $defaultRange = 'latest'; ?>
            <?php include "../../url_parts/_date_ranges.php"; ?>
            <dt>referer</dt>
            <dd>
              <?php $values = [ '<code>all-referers</code> ' . $defaultMsg, '<code>internal</code>', '<code>external</code>', '<code>search-engine</code>', '<code>unknown</code>', '<code>none</code>' ]; ?>
              <?php echo generateListMessage( $values ); ?>
            </dd>
            <?php include "../../url_parts/_agent.php"; ?>
            <?php include "../../url_parts/_autolog.php"; ?>
            <?php include "../../url_parts/_mute_validations.php"; ?>
          </dl>
        </div>
        <div class="col-lg-12 text-center tm">
          <a href="/mediaviews">
            <?php echo $I18N->msg( 'faq-return-to', [ 'variables' => [ $I18N->msg( 'mediaviews-title' ) ], 'parsemag' => true ] ); ?>
          </a>
        </div>
      </main>
      <?php include "../../_footer.php"; ?>
    </div>
  </body>
</html>

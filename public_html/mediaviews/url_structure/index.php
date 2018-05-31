<?php require_once __DIR__ . '/../../../config.php'; ?>
<?php $currentApp = 'mediaviews'; ?>
<?php $appSuffix .= '/url_structure'; ?>
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
          <?php $mediaviewsLink = "<pre dir='ltr' class='url-structure-example'>//tools.wmflabs.org/mediaviews?files={{PAGENAMEE}}</pre>"; ?>
          <?php $fullpageNamee = "<code>{{PAGENAMEE}}</code>"; ?>
          <?php echo $I18N->msg( 'url-structure-mediaviews-example', [ 'variables' => [ $mediaviewsLink, $fullpageNamee ], 'parsemag' => true ] ); ?>
        </div>
        <div>
          <h3>
            <?php echo $I18N->msg( 'url-structure-parameters' ); ?>
            <small><?php echo $I18N->msg( 'url-structure-parameters-order' ); ?></small>
          </h3>
          <hr>
          <dl class="dl-horizontal">
            <dt>files</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-files', [ 'variables' => [ '<code>Lion_cubs_(Panthera_leo).webm|VJSC_1425D-q1.ogv</code>' ], 'parsemag' => true ] ); ?>
            </dd>
            <?php $defaultRange = 'latest'; ?>
            <?php include "../../url_parts/_date_ranges.php"; ?>
            <?php include "../../url_parts/_autolog.php"; ?>
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

<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'title' ) . ' – ' . $I18N->msg( 'url-structure' ); ?>
    </title>
  </head>
  <body class="<?php echo $rtl; ?>">
    <?php $currentApp = 'pageviews'; ?>
    <?php include '../_header.php'; ?>
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
          <?php $pageviewsLink = "<pre dir='ltr' class='url-structure-example'>//tools.wmflabs.org/pageviews?project=en.wikipedia.org&amp;pages={{FULLPAGENAMEE}}</pre>"; ?>
          <?php $project = "<code>en.wikipedia.org</code>"; ?>
          <?php $sitematrixLink = "<a href='https://meta.wikimedia.org/w/api.php?action=sitematrix&amp;formatversion=2'>" . strtolower( $I18N->msg( 'project' ) ) . "</a>"; ?>
          <?php $fullpageNamee = "<code>{{FULLPAGENAMEE}}</code>"; ?>
          <?php echo $I18N->msg( 'url-structure-example', array( 'variables' => array( $pageviewsLink, $project, $sitematrixLink, $fullpageNamee ), 'parsemag' => true ) ); ?>
        </div>
        <div>
          <h3>
            <?php echo $I18N->msg( 'url-structure-parameters' ); ?>
            <small><?php echo $I18N->msg( 'url-structure-parameters-order' ); ?></small>
          </h3>
          <hr>
          <dl class="dl-horizontal">
            <?php include "../url_parts/_project.php"; ?>
            <dt>pages</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-pages' ); ?>
              <br>
              <?php echo $I18N->msg( 'url-structure-onwiki-link', array( 'variables' => array( $fullpageNamee ), 'parsemag' => true ) ); ?>
            </dd>
            <?php $defaultRange = 'latest'; ?>
            <?php include "../url_parts/_date_ranges.php"; ?>
            <?php include "../url_parts/_platform.php"; ?>
            <?php include "../url_parts/_agent.php"; ?>
            <?php include "../url_parts/_autolog.php"; ?>
          </dl>
        </div>
        <div class="col-lg-12 text-center tm">
          <a href="/pageviews">
            <?php echo $I18N->msg( 'faq-return-to', array( 'variables' => array( $I18N->msg( 'title' ) ), 'parsemag' => true ) ); ?>
          </a>
        </div>
      </main>
      <?php $currentApp = "pageviews"; ?>
      <?php include "../_footer.php"; ?>
    </div>
  </body>
</html>

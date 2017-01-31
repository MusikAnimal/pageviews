<!DOCTYPE html>
<html>
  <head>
    <?php include "../../_head.php"; ?>
    <title>
      <?php echo $I18N->msg( 'topviews-title' ) . ' – ' . $I18N->msg( 'url-structure' ); ?>
    </title>
  </head>
  <body class="<?php echo $rtl; ?>">
    <?php $currentApp = 'topviews'; ?>
    <?php include '../../_header.php'; ?>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'topviews-title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'url-structure' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <div>
          <?php $topviewsLink = "<pre dir='ltr' class='url-structure-example'>//tools.wmflabs.org/topviews?project=en.wikipedia.org</pre>"; ?>
          <?php $project = "<code>en.wikipedia.org</code>"; ?>
          <?php $sitematrixLink = "<a href='https://meta.wikimedia.org/w/api.php?action=sitematrix&amp;formatversion=2'>" . strtolower( $I18N->msg( 'project' ) ) . "</a>"; ?>
          <?php $excludes = "<code>excludes</code>"; ?>
          <?php echo $I18N->msg( 'url-structure-topviews-example', [ 'variables' => [ $topviewsLink, $project, $sitematrixLink, $excludes ], 'parsemag' => true ] ); ?>
        </div>
        <div>
          <h3>
            <?php echo $I18N->msg( 'url-structure-parameters' ); ?>
            <small><?php echo $I18N->msg( 'url-structure-parameters-order' ); ?></small>
          </h3>
          <hr>
          <dl class="dl-horizontal">
            <?php include "../../url_parts/_project.php"; ?>
            <dt>excludes</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-excludes' ); ?>
            </dd>
            <dt>date</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-topviews-date', [ 'variables' => [ '<code>date</code>' ], 'parsemag' => true ] ); ?>
              <ul class="special-ranges">
                <li>
                  <code>last-month</code>
                  <?php echo $I18N->msg( 'last-month' ) . " (" . strtolower( $I18N->msg( 'default' ) ) . ")"; ?>
                </li>
                <li>
                  <code>yesterday</code>
                </li>
                <li>
                  <?php echo $I18N->msg( 'url-structure-topviews-date-month', [ 'variables' => [ '<code>YYYY-MM</code>' ], 'parsemag' => true ] ); ?>
                </li>
                <li>
                  <?php echo $I18N->msg( 'url-structure-topviews-date-day', [ 'variables' => [ '<code>YYYY-MM-DD</code>' ], 'parsemag' => true ] ); ?>
                </li>
              </ul>
            </dd>
            <?php include "../../url_parts/_platform.php"; ?>
            <dt>mobileviews</dt>
            <dd><?php echo $I18N->msg( 'url-structure-topviews-mobileviews', [ 'variables' => [ $I18N->msg( 'show-mobile-percentages' ), '<code>platform</code>', '<code>all-access</code>' ] ] ); ?></dd>
            <dt>mainspace</dt>
            <dd><?php echo $I18N->msg( 'url-structure-topviews-mainspace' ); ?></dd>
          </dl>
        </div>
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

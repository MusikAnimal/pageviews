<!DOCTYPE html>
<html>
  <head>
    <?php include "../../_head.php"; ?>
    <title>
      <?php echo $I18N->msg( 'topviews-title' ) . ' – ' . $I18N->msg( 'url-structure' ); ?>
    </title>
  </head>
  <body>
    <div class="container">
      <div class="col-lg-offset-2">
        <!-- Header -->
        <header class="row aqs-row">
          <div class="col-lg-10 text-center">
            <h4>
              <strong><?php echo $I18N->msg( 'topviews-title' ) . ' – ' . $I18N->msg( 'url-structure' ); ?></strong>
            </h4>
          </div>
        </header>
        <div class="col-lg-10">
          <?php $topviewsLink = "<pre>//tools.wmflabs.org/topviews?project=en.wikipedia.org</pre>"; ?>
          <?php $project = "<code>en.wikipedia.org</code>"; ?>
          <?php $sitematrixLink = "<a href='https://meta.wikimedia.org/w/api.php?action=sitematrix&amp;formatversion=2'>" . strtolower( $I18N->msg( 'project' ) ) . "</a>"; ?>
          <?php $excldues = "<code>excludes</code>"; ?>
          <?php echo $I18N->msg( 'url-structure-topviews-example', array( 'variables' => array( $topviewsLink, $project, $sitematrixLink, $excludes ), 'parsemag' => true ) ); ?>
        </div>
        <div class="col-lg-10">
          <h3>
            <?php echo $I18N->msg( 'url-structure-parameters' ); ?>
            <small><?php echo $I18N->msg( 'url-structure-parameters-order' ); ?></small>
          </h3>
          <hr>
          <dl class="dl-horizontal">
            <dt>project</dt>
            <dd>
              <?php $defaultProject = "<code>en.wikipedia.org</code> (" . strtolower( $I18N->msg( 'default' ) ) . ") "; ?>
              <?php echo $I18N->msg( 'url-structure-project', array( 'variables' => array( $defaultProject, $sitematrixLink ), 'parsemag' => true ) ); ?>
            </dd>
            <dt>excludes</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-excludes' ); ?>
            </dd>
            <dt>range</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-special-range', array( 'variables' => array( '<code>start</code>', '<code>end</code>' ), 'parsemag' => true ) ); ?>
              <ul class="special-ranges">
                <li>
                  <code>last-week</code>
                  <?php echo "(" . strtolower( $I18N->msg( 'default' ) ) . ")"; ?>
                  <?php echo $I18N->msg( 'last-week' ); ?>
                </li>
                <li>
                  <code>this-month</code>
                  <?php echo $I18N->msg( 'this-month' ); ?>
                </li>
                <li>
                  <code>last-month</code>
                  <?php echo $I18N->msg( 'last-month' ); ?>
                </li>
                <li>
                  <code>latest</code>
                  <?php echo $I18N->msg( 'url-structure-special-range-latest' ); ?>
                </li>
                <li>
                  <code>latest-<i>N</i></code>
                  <?php echo $I18N->msg( 'url-structure-special-range-latest-n' ); ?>
                </li>
              </ul>
            </dd>
            <dt>start</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-start-date', array( 'variables' => array( '<code>YYYY-MM-DD</code>', '<code>end</code>' ), 'parsemag' => true ) ); ?>
            </dd>
            <dt>end</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-end-date', array( 'variables' => array( '<code>YYYY-MM-DD</code>' ), 'parsemag' => true ) ); ?>
            </dd>
            <dt>platform</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-platform', array( 'variables' => array( '<code>all-access</code> (' . strtolower( $I18N->msg( 'default' ) ) . ')', '<code>desktop</code>', '<code>mobile-app</code>', '<code>mobile-web</code>' ), 'parsemag' => true ) ); ?>
            </dd>
          </dl>
        </div>
        <div class="col-lg-10 text-center">
          <hr>
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
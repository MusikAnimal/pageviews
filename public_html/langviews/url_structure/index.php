<!DOCTYPE html>
<html>
  <head>
    <?php include '../../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'langviews-title' ) . ' – ' . $I18N->msg( 'url-structure' ); ?>
    </title>
  </head>
  <body>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'langviews-title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'url-structure' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <div>
          <?php $langviewsLink = "<pre>//tools.wmflabs.org/langviews?project=en.wikipedia.org&amp;pages={{FULLPAGENAMEE}}</pre>"; ?>
          <?php $project = "<code>en.wikipedia.org</code>"; ?>
          <?php $sitematrixLink = "<a href='https://meta.wikimedia.org/w/api.php?action=sitematrix&amp;formatversion=2'>" . strtolower( $I18N->msg( 'project' ) ) . "</a>"; ?>
          <?php $fullpageNamee = "<code>{{FULLPAGENAMEE}}</code>"; ?>
          <?php echo $I18N->msg( 'url-structure-example', array( 'variables' => array( $langviewsLink, $project, $sitematrixLink, $fullpageNamee ), 'parsemag' => true ) ); ?>
        </div>
        <div>
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
              <br>
              <?php $wikipediaLink = "<a href='https://www.wikipedia.org/'>Wikipedia</a>"; ?>
              <?php $wikivoyageLink = "<a href='https://www.wikivoyage.org/'>Wikivoyage</a>"; ?>
              <?php echo $I18N->msg( 'url-structure-project-multilang', array( 'variables' => array( $wikipediaLink, $wikivoyageLink ), 'parsemag' => true ) ); ?>
            </dd>
            <dt>page</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-page' ); ?>
              <?php echo $I18N->msg( 'url-structure-onwiki-link', array( 'variables' => array( $fullpageNamee ), 'parsemag' => true ) ); ?>
            </dd>
            <dt>range</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-special-range', array( 'variables' => array( '<code>start</code>', '<code>end</code>' ), 'parsemag' => true ) ); ?>
              <ul class="special-ranges">
                <li>
                  <code>latest</code>
                  <?php echo "(" . strtolower( $I18N->msg( 'default' ) ) . ")"; ?>
                  <?php echo $I18N->msg( 'url-structure-special-range-latest' ); ?>
                </li>
                <li>
                  <code>latest-<i>N</i></code>
                  <?php echo $I18N->msg( 'url-structure-special-range-latest-n' ); ?>
                </li>
                <li>
                  <code>last-week</code>
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
            <dt>agent</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-agent', array( 'variables' => array( '<code>user</code>', '<code>spider</code>', '<code>bot</code>', '<code>all-agents</code>' ), 'parsemag' => true ) ); ?>
            </dd>
            <dt>sort</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-sort', array( 'variables' => array( '<code>lang</code>', '<code>title</code>', '<code>badges</code>', '<code>views</code>' ), 'parsemag' => true ) ); ?>
            </dd>
            <dt>direction</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-sort-direction', array( 'variables' => array( '<code>1</code>', '<code>-1</code>' ), 'parsemag' => true ) ); ?>
            </dd>
          </dl>
        </div>
        <div class="col-lg-12 text-center tm">
          <a href="/langviews">
            <?php echo $I18N->msg( 'faq-return-to', array( 'variables' => array( $I18N->msg( 'langviews-title' ) ), 'parsemag' => true ) ); ?>
          </a>
        </div>
        <?php $currentApp = "langviews"; ?>
        <?php include "../../_footer.php"; ?>
      </main>
    </div>
  </body>
</html>
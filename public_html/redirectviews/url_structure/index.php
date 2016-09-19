<!DOCTYPE html>
<html>
  <head>
    <?php include '../../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'redirectviews-title' ) . ' – ' . $I18N->msg( 'url-structure' ); ?>
    </title>
  </head>
  <body>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'redirectviews-title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'url-structure' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <div>
          <?php $redirectviewsLink = "<pre>//tools.wmflabs.org/redirectviews?project=en.wikipedia.org&amp;pages={{FULLPAGENAMEE}}</pre>"; ?>
          <?php $project = "<code>en.wikipedia.org</code>"; ?>
          <?php $sitematrixLink = "<a href='https://meta.wikimedia.org/w/api.php?action=sitematrix&amp;formatversion=2'>" . strtolower( $I18N->msg( 'project' ) ) . "</a>"; ?>
          <?php $fullpageNamee = "<code>{{FULLPAGENAMEE}}</code>"; ?>
          <?php echo $I18N->msg( 'url-structure-example', array( 'variables' => array( $redirectviewsLink, $project, $sitematrixLink, $fullpageNamee ), 'parsemag' => true ) ); ?>
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
            <?php $defaultRange = 'latest'; ?>
            <?php include "../../url_parts/date_ranges.php"; ?>
            <?php include "../../url_parts/platform.php"; ?>
            <?php include "../../url_parts/agent.php"; ?>
            <dt>sort</dt>
            <dd>
              <?php $values = [ '<code>title</code>', '<code>section</code>', '<code>views</code>' ]; ?>
              <?php echo $I18N->msg( 'url-structure-sort' ) . ' ' . generateListMessage( $values ); ?>
            </dd>
            <dt>direction</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-sort-direction', array( 'variables' => array( '<code>1</code>', '<code>-1</code>' ), 'parsemag' => true ) ); ?>
            </dd>
          </dl>
        </div>
        <div class="col-lg-12 text-center tm">
          <a href="/redirectviews">
            <?php echo $I18N->msg( 'faq-return-to', array( 'variables' => array( $I18N->msg( 'redirectviews-title' ) ), 'parsemag' => true ) ); ?>
          </a>
        </div>
        <?php $currentApp = "redirectviews"; ?>
        <?php include "../../_footer.php"; ?>
      </main>
    </div>
  </body>
</html>
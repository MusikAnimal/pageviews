<!DOCTYPE html>
<html>
  <head>
    <?php include '../../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'massviews-title' ) . ' – ' . $I18N->msg( 'url-structure' ); ?>
    </title>
  </head>
  <body>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'massviews-title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'url-structure' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <div>
          <?php $pagePileExample = "<pre>//tools.wmflabs.org/massviews?source=pagepile&amp;target=12345</pre>"; ?>
          <?php $categoryExample = "<pre>//tools.wmflabs.org/massviews?source=category&amp;target=//en.wikipedia.org/wiki/Category:Folk_musicians_from_New_York</pre>"; ?>
          <?php $wikiCategoryExample = "<pre>//tools.wmflabs.org/massviews?source=category&amp;{{urlencode:{{fullurl}}}}</pre>"; ?>
          <?php echo $I18N->msg( 'url-structure-massviews-example', array( 'variables' => array( $pagePileExample, $categoryExample, $wikiCategoryExample ), 'parsemag' => true ) ); ?>
        </div>
        <div>
          <h3>
            <?php echo $I18N->msg( 'url-structure-parameters' ); ?>
            <small><?php echo $I18N->msg( 'url-structure-parameters-order' ); ?></small>
          </h3>
          <hr>
          <dl class="dl-horizontal">
            <dt>source</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-massviews-source', array( 'variables' => array( '<code>pagepile</code>', '<code>category</code>', '<code>transclusions</code>' ) ) ); ?>
            </dd>
            <dt>target</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-massviews-target' ); ?>
              <br>
              <?php echo $I18N->msg( 'url-structure-massviews-target-example', array( 'variables' => array( '<pre>https://en.wikipedia.org/w/index.php?title=Category:Folk_musicians_from_New_York</pre>', '<pre>https%3A%2F%2Fen.wikipedia.org%2Fw%2Findex.php%3Ftitle%3DCategory%3AFolk_musicians_from_New_York</pre>', '<pre>//en.wikipedia.org/wiki/Category:Folk_musicians_from_New_York</pre>' ) ) ); ?>
            </dd>
            <?php $defaultRange = 'latest'; ?>
            <?php include "../../url_parts/date_ranges.php"; ?>
            <?php include "../../url_parts/platform.php"; ?>
            <?php include "../../url_parts/agent.php"; ?>
            <dt>sort</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-sort-massviews', array( 'variables' => array( '<code>title</code>', '<code>views</code>' ), 'parsemag' => true ) ); ?>
            </dd>
            <dt>direction</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-sort-direction', array( 'variables' => array( '<code>1</code>', '<code>-1</code>' ), 'parsemag' => true ) ); ?>
            </dd>
            <dt>view</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-view', array( 'variables' => array( '<code>list</code>', '<code>chart</code>' ), 'parsemag' => true ) ); ?>
            </dd>
            <dt>subjectpage</dt>
            <dd>
              <?php $faqLink = "<a href='/massviews/faq#category_subject_toggle'>" . $I18N->msg( 'category-subject-toggle' ) . "</a>"; ?>
              <?php echo $I18N->msg( 'url-structure-subjectpage', array( 'variables' => array( $faqLink, '<code>1</code>', '<code>0</code>' ), 'parsemag' => true ) ); ?>
            </dd>
            <dt>project</dt>
            <dd>
              <?php $sitematrixLink = "<a href='https://meta.wikimedia.org/w/api.php?action=sitematrix&amp;formatversion=2'>" . strtolower( $I18N->msg( 'project' ) ) . "</a>"; ?>
              <?php echo $I18N->msg( 'url-structure-project', array( 'variables' => array( 'en.wikipedia.org', $sitematrixLink ), 'parsemag' => true ) ); ?>
            </dd>
          </dl>
        </div>
        <div class="col-lg-12 text-center tm">
          <a href="/massviews">
            <?php echo $I18N->msg( 'faq-return-to', array( 'variables' => array( $I18N->msg( 'massviews-title' ) ), 'parsemag' => true ) ); ?>
          </a>
        </div>
        <?php $currentApp = "massviews"; ?>
        <?php include "../../_footer.php"; ?>
      </main>
    </div>
  </body>
</html>
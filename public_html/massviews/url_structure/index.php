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
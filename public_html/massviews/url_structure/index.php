<!DOCTYPE html>
<html>
  <head>
    <?php include '../../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'massviews-title' ) . ' – ' . $I18N->msg( 'url-structure' ); ?>
    </title>
  </head>
  <body class="<?php echo $rtl; ?>">
    <?php $currentApp = 'massviews'; ?>
    <?php include '../../_header.php'; ?>
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
          <?php $pagePileExample = "<pre dir='ltr' class='url-structure-example'>//tools.wmflabs.org/massviews?source=pagepile&amp;target=12345</pre>"; ?>
          <?php $categoryExample = "<pre dir='ltr' class='url-structure-example'>//tools.wmflabs.org/massviews?source=category&amp;target=//en.wikipedia.org/wiki/Category:Folk_musicians_from_New_York</pre>"; ?>
          <?php $wikiCategoryExample = "<pre dir='ltr' class='url-structure-example'>//tools.wmflabs.org/massviews?source=category&amp;target={{urlencode:{{fullurl}}}}</pre>"; ?>
          <?php echo $I18N->msg( 'url-structure-massviews-example', [ 'variables' => [ $pagePileExample, $categoryExample, $wikiCategoryExample ], 'parsemag' => true ] ); ?>
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
              <?php $params = [ '<code>pagepile</code>', '<code>category</code>', '<code>wikilinks</code>', '<code>subpages</code>', '<code>transclusions</code>', '<code>external-link</code>', '<code>hashtag</code>', '<code>quarry</code>' ]; ?>
              <?php $comma = $I18N->msg( 'comma-character' ) . ' '; ?>
              <?php echo $I18N->msg( 'list-values', [ 'variables' => [ implode( $params, $comma ), count( $params ) ], 'parsemag' => true ] ); ?>
            </dd>
            <dt>target</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-massviews-target' ); ?>
              <br>
              <?php echo $I18N->msg( 'url-structure-massviews-target-example', [ 'variables' => [ '<pre>https://en.wikipedia.org/w/index.php?title=Category:Folk_musicians_from_New_York</pre>', '<pre>https%3A%2F%2Fen.wikipedia.org%2Fw%2Findex.php%3Ftitle%3DCategory%3AFolk_musicians_from_New_York</pre>', '<pre>//en.wikipedia.org/wiki/Category:Folk_musicians_from_New_York</pre>' ] ] ); ?>
            </dd>
            <?php $defaultRange = 'latest'; ?>
            <?php include "../../url_parts/_date_ranges.php"; ?>
            <?php include "../../url_parts/_platform.php"; ?>
            <?php include "../../url_parts/_agent.php"; ?>
            <dt>sort</dt>
            <dd>
              <?php $values = [ '<code>title</code>', '<code>views</code>' ]; ?>
              <?php echo $I18N->msg( 'url-structure-sort' ) . ' ' . generateListMessage( $values ); ?>
            </dd>
            <dt>direction</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-sort-direction', [ 'variables' => [ '<code>1</code>', '<code>-1</code>' ], 'parsemag' => true ] ); ?>
            </dd>
            <dt>view</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-view', [ 'variables' => [ '<code>list</code>', '<code>chart</code>' ], 'parsemag' => true ] ); ?>
            </dd>
            <dt>subcategories</dt>
            <dd>
              <?php $subcatMsg = $I18N->msg( 'include-subcategories' ); ?>
              <?php echo $I18N->msg( 'url-structure-subjectpage', [ 'variables' => [ $subcatMsg, '<code>1</code>', '<code>0</code>' ], 'parsemag' => true ] ); ?>
            </dd>
            <dt>subjectpage</dt>
            <dd>
              <?php $faqLink = "<a href='/massviews/faq#category_subject_toggle'>" . $I18N->msg( 'category-subject-toggle' ) . "</a>"; ?>
              <?php echo $I18N->msg( 'url-structure-subjectpage', [ 'variables' => [ $faqLink, '<code>1</code>', '<code>0</code>' ], 'parsemag' => true ] ); ?>
            </dd>
            <dt>project</dt>
            <dd>
              <?php $sitematrixLink = "<a href='https://meta.wikimedia.org/w/api.php?action=sitematrix&amp;formatversion=2'>" . strtolower( $I18N->msg( 'project' ) ) . "</a>"; ?>
              <?php echo $I18N->msg( 'url-structure-massviews-project', [ 'variables' => [ $sitematrixLink ], 'parsemag' => true ] ); ?>
            </dd>
          </dl>
        </div>
        <div class="col-lg-12 text-center tm">
          <a href="/massviews">
            <?php echo $I18N->msg( 'faq-return-to', [ 'variables' => [ $I18N->msg( 'massviews-title' ) ], 'parsemag' => true ] ); ?>
          </a>
        </div>
      </main>
      <?php include "../../_footer.php"; ?>
    </div>
  </body>
</html>

<!DOCTYPE html>
<html>
  <head>
    <?php include '../../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'userviews-title' ) . ' – ' . $I18N->msg( 'url-structure' ); ?>
    </title>
  </head>
  <body class="<?php echo $rtl; ?>">
    <?php $currentApp = 'userviews'; ?>
    <?php include '../../_header.php'; ?>
    <div class="container">
      <header class="col-lg-12 text-center">
        <h4>
          <strong>
            <?php echo $I18N->msg( 'userviews-title' ); ?>
          </strong>
          <small class="app-description">
            <?php echo $I18N->msg( 'url-structure' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <div>
          <?php $userviewsLink = "<pre dir='ltr' class='url-structure-example'>//tools.wmflabs.org/userviews?project={{SERVERNAME}}&amp;user={{ROOTPAGENAMEE}}</pre>"; ?>
          <?php $sitematrixLink = "<a href='https://meta.wikimedia.org/w/api.php?action=sitematrix&amp;formatversion=2'>" . strtolower( $I18N->msg( 'project' ) ) . "</a>"; ?>
          <?php $rootpageNamee = "<code>{{ROOTPAGENAMEE}}</code>"; ?>
          <?php echo $I18N->msg( 'url-structure-userviews-example', [ 'variables' => [ $userviewsLink, $rootpageNamee ], 'parsemag' => true ] ); ?>
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
              <?php echo $I18N->msg( 'url-structure-project', [ 'variables' => [ $defaultProject, $sitematrixLink ], 'parsemag' => true ] ); ?>
            </dd>
            <dt>user</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-user' ); ?>
              <?php echo $I18N->msg( 'url-structure-userviews-onwiki-link', [ 'variables' => [ $rootpageNamee ], 'parsemag' => true ] ); ?>
            </dd>
            <dt>namespace</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-userviews-namespace', [ 'variables' => [ '<code>0</code>', '<code>all</code>' ] ] ); ?>
            </dd>
            <dt>redirects</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-userviews-redirects', [ 'variables' => [ '<code>0</code>', '<code>1</code>', '<code>2</code>' ] ] ); ?>
            </dd>
            <?php $defaultRange = 'latest'; ?>
            <?php include "../../url_parts/_date_ranges.php"; ?>
            <?php include "../../url_parts/_platform.php"; ?>
            <?php include "../../url_parts/_agent.php"; ?>
            <dt>sort</dt>
            <dd>
              <?php $values = [ '<code>lang</code>', '<code>title</code>', '<code>views</code>', '<code>datestamp</code>', '<code>size</code>' ]; ?>
              <?php echo $I18N->msg( 'url-structure-sort' ) . ' ' . generateListMessage( $values ); ?>
            </dd>
            <dt>direction</dt>
            <dd>
              <?php echo $I18N->msg( 'url-structure-sort-direction', [ 'variables' => [ '<code>1</code>', '<code>-1</code>' ], 'parsemag' => true ] ); ?>
            </dd>
            <?php include "../../url_parts/_autolog.php"; ?>
          </dl>
        </div>
        <div class="col-lg-12 text-center tm">
          <a href="/userviews">
            <?php echo $I18N->msg( 'faq-return-to', [ 'variables' => [ $I18N->msg( 'userviews-title' ) ], 'parsemag' => true ] ); ?>
          </a>
        </div>
      </main>
      <?php include "../../_footer.php"; ?>
    </div>
  </body>
</html>

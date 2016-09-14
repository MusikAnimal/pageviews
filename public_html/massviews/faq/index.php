<!DOCTYPE html>
<html>
  <head>
    <?php include '../../_head.php'; ?>
    <title>
      <?php echo $I18N->msg( 'massviews-title' ) . ' - ' . $I18N->msg( 'faq' ); ?>
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
            <?php echo $I18N->msg( 'faq' ); ?>
          </small>
        </h4>
      </header>
      <main class="col-lg-10 col-lg-offset-1">
        <ul class="list-group">
          <?php include "../../faq_parts/throttle.php"; ?>
          <li class="list-group-item" id="sources">
            <p>
              <strong><?php echo $I18N->msg( 'faq-massviews-sources-title' ); ?></strong>
            </p>
            <ul class="faq-ul">
              <li>
                <?php $categoryLink = "<a href='https://en.wikipedia.org/wiki/Category:Folk_musicians_from_New_York'>https://en.wikipedia.org/wiki/Category:Folk_musicians_from_New_York</a>"; ?>
                <i><?php echo $I18N->msg( 'category' ); ?></i>
                &mdash;
                <?php echo $I18N->msg( 'faq-massviews-sources-category', array( 'variables' => array( $categoryLink ) ) ); ?>
              </li>
              <li>
                <?php $wikilinksLink = "<a href='https://en.wikipedia.org/wiki/Book:New_York_City' target='_blank'>https://en.wikipedia.org/wiki/Book:New_York_City</a>"; ?>
                <i><?php echo $I18N->msg( 'wikilinks' ); ?></i>
                &mdash;
                <?php echo $I18N->msg( 'faq-massviews-sources-wikilinks', array( 'variables' => array( $wikilinksLink ) ) ); ?>
              </li>
              <li>
                <?php $pagePileLink = "<a href='//tools.wmflabs.org/pagepile' target='_blank'>Page Pile</a>"; ?>
                <i>Page Pile</i>
                &mdash;
                <?php echo $I18N->msg( 'faq-massviews-sources-pagepile', array( 'variables' => array( $pagePileLink ) ) ); ?>
              </li>
              <li>
                <?php $templateLink = "<a href='https://en.wikipedia.org/wiki/Template:Infobox_Olympic_games'>https://en.wikipedia.org/wiki/Template:Infobox_Olympic_games</a>"; ?>
                <i><?php echo $I18N->msg( 'transclusions' ); ?></i>
                &mdash;
                <?php echo $I18N->msg( 'faq-massviews-sources-template', array( 'variables' => array( $templateLink ) ) ); ?>
              </li>
              <li>
                <?php $subpagesLink = "<a href='https://en.wikipedia.org/wiki/User:Jimbo_Wales'>https://en.wikipedia.org/wiki/User:Example</a>"; ?>
                <i><?php echo $I18N->msg( 'subpages' ); ?></i>
                &mdash;
                <?php echo $I18N->msg( 'faq-massviews-sources-subpages', array( 'variables' => array( $subpagesLink ) ) ); ?>
              </li>
              <li>
                <i>Quarry</i>
                &mdash;
                <?php echo $I18N->msg( 'faq-massviews-sources-quarry', array( 'variables' => array( 'Quarry', 'page_title' ) ) ); ?>
              </li>
            </ul>
          </li>
          <li class="list-group-item" id="category_subject_toggle">
            <p>
              <strong><?php echo $I18N->msg( 'faq-massviews-subject-page-title', array( 'variables' => array( $I18N->msg( 'category-subject-toggle' ) ) ) ); ?></strong>
            </p>
            <p>
              <?php echo $I18N->msg( 'faq-massviews-subject-page-body' ); ?>
            </p>
          </li>
          <?php include "../../faq_parts/old_data.php"; ?>
          <?php include "../../faq_parts/todays_data.php"; ?>
          <?php include "../../faq_parts/agents.php"; ?>
          <?php include "../../faq_parts/feedback.php"; ?>
        </ul>
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
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
          <li class="list-group-item" id="sources">
            <p>
              <strong><?php echo $I18N->msg( 'faq-massviews-sources-title' ); ?></strong>
            </p>
            <ul class="faq-ul">
              <li>
                <?php $categoryLink = "<a href='https://en.wikipedia.org/wiki/Category:Folk_musicians_from_New_York'>https://en.wikipedia.org/wiki/Category:Folk_musicians_from_New_York</a>"; ?>
                <i><?php echo $I18N->msg( 'category' ); ?></i>
                &mdash;
                <?php echo $I18N->msg( 'massviews-category-description', [ 'variables' => [ "<a target='_blank' href='https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Categories'>" . strtolower( $I18N->msg( 'category' ) ) . "</a>" ] ] ) . '.'; ?>
                <?php echo $I18N->msg( 'faq-massviews-sources-category', [ 'variables' => [ $categoryLink ] ] ); ?>
              </li>
              <li>
                <?php $wikilinksLink = "<a href='https://en.wikipedia.org/wiki/Book:New_York_City' target='_blank'>https://en.wikipedia.org/wiki/Book:New_York_City</a>"; ?>
                <i><?php echo $I18N->msg( 'wikilinks' ); ?></i>
                &mdash;
                <?php echo $I18N->msg( 'massviews-wikilinks-description', [ 'variables' => [ 'https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Wikilinks' ] ] ) . '.'; ?>
                <?php echo $I18N->msg( 'faq-massviews-sources-wikilinks', [ 'variables' => [ $wikilinksLink ] ] ); ?>
              </li>
              <li>
                <?php $pagePileLink = "<a href='//tools.wmflabs.org/pagepile' target='_blank'>Page Pile</a>"; ?>
                <i>Page Pile</i>
                &mdash;
                <?php echo $I18N->msg( 'massviews-pagepile-description', [ 'variables' => [ "<a target='_blank' href='//tools.wmflabs.org/pagepile'>PagePile</a>" ] ] ) . '.'; ?>
                <?php echo $I18N->msg( 'faq-massviews-sources-pagepile', [ 'variables' => [ $pagePileLink ] ] ); ?>
              </li>
              <li>
                <?php $subpagesLink = "<a href='https://en.wikipedia.org/wiki/User:Jimbo_Wales'>https://en.wikipedia.org/wiki/User:Example</a>"; ?>
                <i><?php echo $I18N->msg( 'subpages' ); ?></i>
                &mdash;
                <?php echo $I18N->msg( 'massviews-subpages-description', [ 'variables' => [ "<a target='_blank' href='https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Subpages'>" . strtolower( $I18N->msg( 'subpages' ) . "</a>" ) ] ] ) . '.'; ?>
                <?php echo $I18N->msg( 'faq-massviews-sources-subpages', [ 'variables' => [ $subpagesLink ] ] ); ?>
              </li>
              <li>
                <?php $templateLink = "<a href='https://en.wikipedia.org/wiki/Template:Infobox_Olympic_games'>https://en.wikipedia.org/wiki/Template:Infobox_Olympic_games</a>"; ?>
                <i><?php echo $I18N->msg( 'transclusions' ); ?></i>
                &mdash;
                <?php echo $I18N->msg( 'massviews-transclusions-description', [ 'variables' => [ 'https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Transclusion' ] ] ) . '.'; ?>
                <?php echo $I18N->msg( 'faq-massviews-sources-template', [ 'variables' => [ $templateLink ] ] ); ?>
              </li>
              <li>
                <?php $linkSearchLink = "<a href='https://en.wikipedia.org/wiki/Special:LinkSearch/*.nycgo.com'>*.nycgo.com</a>"; ?>
                <?php $docLink = "<a target='_blank' href='https://www.mediawiki.org/wiki/Help:Links#External_links'>" . strtolower( $I18N->msg( 'external-link' ) ) . "</a>"; ?>
                <?php $linkSearchDocLink = "<a target='_blank' href='https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Linksearch'>" . $I18N->msg( 'documentation' ) . "</a>"; ?>
                <i><?php echo $I18N->msg( 'external-link' ); ?></i>
                &mdash;
                <?php echo $I18N->msg( 'massviews-external-link-description', [ 'variables' => [ $docLink ] ] ) . '.'; ?>
                <?php echo $I18N->msg( 'faq-massviews-sources-external-link', [ 'variables' => [ $linkSearchLink, $linkSearchDocLink ] ] ); ?>
              </li>
              <li>
                <?php $hashtagCredits = $I18N->msg( 'hashtag-credits', [ 'variables' => [ "<a target='_blank' href='//tools.wmflabs.org/hashtags'>Wikipedia social search</a>" ] ] ); ?>
                <?php $hashtagLink = "<a href='http://tools.wmflabs.org/hashtags/search/100wikidays'>#100wikidays</a>"; ?>
                <?php $infoLink = "<a href='http://tools.wmflabs.org/hashtags/docs'>" . $I18N->msg( 'documentation' ) . "</a>"; ?>
                <i><?php echo $I18N->msg( 'hashtag' ); ?></i>
                &mdash;
                <?php echo $I18N->msg( 'massviews-hashtag-description', [ 'variables' => [ $hashtagCredits, "<a target='_blank' href='//tools.wmflabs.org/hashtags/docs'>" . strtolower( $I18N->msg( 'hashtag' ) ) . "</a>" ] ] ) . '.'; ?>
                <?php echo $I18N->msg( 'faq-massviews-sources-hashtag', [ 'variables' => [ '<code>#</code>', $hashtagLink, $infoLink ] ] ); ?>
              </li>
              <li>
                <i>Quarry</i>
                &mdash;
                <?php echo $I18N->msg( 'massviews-quarry-description', [ 'variables' => [ "<a target='_blank' href='//quarry.wmflabs.org'>Quarry</a>" ] ] ) . '.'; ?>
                <?php echo $I18N->msg( 'faq-massviews-sources-quarry', [ 'variables' => [ 'Quarry', 'page_title' ] ] ); ?>
              </li>
            </ul>
          </li>
          <li class="list-group-item" id="category_subject_toggle">
            <p>
              <strong><?php echo $I18N->msg( 'faq-massviews-subject-page-title', [ 'variables' => [ $I18N->msg( 'category-subject-toggle' ) ] ] ); ?></strong>
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
            <?php echo $I18N->msg( 'faq-return-to', [ 'variables' => [ $I18N->msg( 'massviews-title' ) ], 'parsemag' => true ] ); ?>
          </a>
        </div>
        <?php $currentApp = "massviews"; ?>
        <?php include "../../_footer.php"; ?>
      </main>
    </div>
  </body>
</html>
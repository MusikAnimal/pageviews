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
                <?php $pagePileId = $I18N->msg( 'page-pile-id' ); ?>
                <?php $pagePileLink = "<a href='//tools.wmflabs.org/pagepile' target='_blank'>Page Pile</a>"; ?>
                <i><?php echo $pagePileId; ?></i>
                <?php echo $I18N->msg( 'faq-massviews-sources-pagepile', array( 'variables' => array( $pagePileLink ) ) ); ?>
              </li>
              <li>
                <?php $categoryLink = "<a href='https://en.wikipedia.org/wiki/Category:Folk_musicians_from_New_York'>https://en.wikipedia.org/wiki/Category:Folk_musicians_from_New_York</a>"; ?>
                <i><?php echo $I18N->msg( 'category-url' ); ?></i>
                <?php echo $I18N->msg( 'faq-massviews-sources-category-url', array( 'variables' => array( $categoryLink ) ) ); ?>
              </li>
              <li>
                <?php $templateLink = "<a href='https://en.wikipedia.org/wiki/Template:Infobox_Olympic_games'>https://en.wikipedia.org/wiki/Template:Infobox_Olympic_games</a>"; ?>
                <i><?php echo $I18N->msg( 'template-url' ); ?></i>
                <?php echo $I18N->msg( 'faq-massviews-sources-template-url', array( 'variables' => array( $templateLink ) ) ); ?>
              </li>
              <li>
                <i>Quarry</i>
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
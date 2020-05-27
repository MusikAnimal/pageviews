<?php $isAppPage = strpos( $_SERVER['REQUEST_URI'], '/faq' ) === false && strpos( $_SERVER['REQUEST_URI'], '/url_structure' ) === false; ?>
<nav class="top-nav navbar">
  <button class="navbar-toggle collapsed pull-left" data-toggle="collapse" data-target=".interapp-navigation" aria-expanded="false">
    <span class="sr-only">Toggle navigation</span>
    <span class="icon-bar"></span>
    <span class="icon-bar"></span>
    <span class="icon-bar"></span>
  </button>
  <div class="pull-right nav-buttons">
    <?php if ( $isAppPage ) { ?>
      <button class="btn btn-default btn-sm btn-settings js-test-settings" data-target="#settings-modal" data-toggle="modal">
        <span class="glyphicon glyphicon-wrench"></span>
        <?php echo $I18N->msg( 'settings' ); ?>
      </button>
    <?php } ?>
    <div class="btn-group dropdown help-btn-group">
      <button class="btn btn-default btn-sm dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <span class="glyphicon glyphicon-question-sign"></span>
        <?php echo $I18N->msg( 'help' ); ?>
        <span class="caret"></span>
      </button>
      <ul class="dropdown-menu dropdown-menu-right">
        <?php if ( $currentApp !== 'metaviews' ) { ?>
          <li>
            <a href="/<?php echo $currentApp; ?>/faq">
              <?php echo $I18N->msg( 'faq' ); ?>
            </a>
          </li>
          <li>
            <a href="/<?php echo $currentApp; ?>/url_structure">
              <?php echo $I18N->msg( 'url-structure' ); ?>
            </a>
          </li>
        <?php } ?>
        <li>
          <a href="https://meta.wikimedia.org/wiki/Pageviews_Analysis">
            <?php echo $I18N->msg( 'documentation' ); ?>
          </a>
        </li>
        <li class="divider" role="separator"></li>
        <li>
          <a href="https://meta.wikimedia.org/wiki/Talk:Pageviews_Analysis">
            <?php echo $I18N->msg( 'report-issue' ); ?>
          </a>
        </li>
      </ul>
    </div>
    <div class="btn-group dropdown lang-group">
      <button class="btn btn-default btn-sm dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"></path>
        </svg>
        <?php echo $currentLang; ?>
        <span class="caret"></span>
      </button>
      <ul class="dropdown-menu dropdown-menu-right">
        <li>
          <a href="https://translatewiki.net/w/i.php?title=Special:MessageGroupStats&group=out-pageviews">
            <?php echo $I18N->msg( 'help-translate' ); ?>
          </a>
        </li>
        <li class="divider" role="separator"></li>
        <?php foreach ($langs as $lang => $langName) { ?>
          <?php if ($lang === 'qqq') continue; ?>
          <li>
            <a class="lang-link" href="#" data-lang="<?php echo $lang; ?>"><?php echo $langName; ?></a>
          </li>
        <?php } ?>
      </ul>
    </div>
  </div>
  <div class="navbar-collapse collapse interapp-navigation">
    <a class="home-link pull-left" href="<?php echo '/'; ?>"></a>
    <ol class="interapp-links nav navbar-nav navbar-left">
      <?php $apps = [ 'pageviews', 'langviews', 'topviews', 'siteviews', 'massviews', 'redirectviews', 'userviews', 'mediaviews' ]; ?>
      <?php if ( $rtl === 'rtl' ) { ?>
        <?php $apps = array_reverse( $apps ); ?>
      <?php } ?>
      <?php foreach( $apps as $app ) { ?>
        <?php $i18nName = $app === 'pageviews' ? '' : $app . '-'; ?>
        <?php if ( $app === $currentApp ) { ?>
          <li class="interapp-links--entry active" role="presentation">
            <a class="interapp-link interapp-link--<?php echo $app; ?>" href="/<?php echo $app; ?>">
              <?php echo $I18N->msg( $app ); ?>
            </a>
          </li>
        <?php } else { ?>
          <li class="interapp-links--entry" role="presentation">
            <a class="interapp-link interapp-link--<?php echo $app; ?>" href="/<?php echo $app; ?>">
              <?php echo $I18N->msg( $app ); ?>
            </a>
          </li>
        <?php } ?>
      <?php } ?>
      <li class="interapp-links--more dropdown hidden">
        <a class="interapp-link dropdown-toggle" href="<?php echo '#'; ?>" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
          <?php echo $I18N->msg( 'more' ); ?>
          <span class="caret"></span>
        </a>
        <ul class="dropdown-menu"></ul>
      </li>
    </ol>
  </div>
</nav>
<?php if ( $isAppPage ) { ?>
  <header class="site-header">
    <h4 class="text-center">
      <strong>
        <?php if ( $currentApp === 'pageviews' ) { ?>
          <?php echo $I18N->msg( 'title' ); ?>
        <?php } elseif ( $currentApp === 'metaviews' ) { ?>
          Metaviews Analysis
        <?php } else { ?>
          <?php echo $I18N->msg( $currentApp . '-title' ); ?>
        <?php } ?>
      </strong>
      <small class="app-description">
        <?php if ( $currentApp === 'metaviews' ) { ?>
          Pageviews Analysis of Pageviews Analysis
        <?php } else { ?>
          <?php echo $I18N->msg( $currentApp. '-description' ); ?>
        <?php } ?>
      </small>
    </h4>
  </header>
<?php } ?>

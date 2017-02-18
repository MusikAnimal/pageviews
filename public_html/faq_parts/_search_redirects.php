<li class="list-group-item" id="search_redirects">
  <p>
    <strong><?php echo $I18N->msg( 'faq-search-redirects-title' ); ?></strong>
  </p>
  <p>
    <?php $redirectViewsLink = "<a href='/redirectviews'>" . $I18N->msg( 'redirectviews' ) . "</a>"; ?>
    <?php $variables = array( $I18N->msg( 'autocompletion-redirects' ), $I18N->msg( 'settings' ), $redirectViewsLink ); ?>
    <?php echo $I18N->msg( 'faq-search-redirects-body', array( 'variables' => $variables ) ); ?>
  </p>
</li>

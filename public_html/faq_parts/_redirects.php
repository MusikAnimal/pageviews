<li class="list-group-item" id="redirects">
  <p>
    <strong><?php echo $I18N->msg( 'faq-redirects-title' ); ?></strong>
  </p>
  <?php $redirectsOption = $I18N->msg( 'include-redirects' ); ?>
  <p>
    <?php $redirectViewsLink = "<a href='/redirectviews'>" . $I18N->msg( 'redirectviews' ) . "</a>"; ?>
    <?php echo $I18N->msg( 'faq-redirects-body', [ 'variables' => [ $redirectViewsLink, $redirectsOption ] ] ); ?>
  </p>
  <p>
    <?php echo $I18N->msg( 'faq-redirects-body2', [ 'variables' => [ $redirectsOption ] ] ); ?>
  </p>
</li>

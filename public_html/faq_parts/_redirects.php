<li class="list-group-item" id="redirects">
  <p>
    <strong><?php echo $I18N->msg( 'faq-redirects-title' ); ?></strong>
  </p>
  <p>
    <?php $redirectViewsLink = "<a href='/redirectviews'>" . $I18N->msg( 'redirectviews' ) . "</a>"; ?>
    <?php echo $I18N->msg( 'faq-redirects-body', [ 'variables' => [ $redirectViewsLink ] ] ); ?>
  </p>
</li>

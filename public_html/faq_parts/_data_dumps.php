<li class="list-group-item" id="data_dumps">
  <p>
    <strong><?php echo $I18N->msg( 'faq-data-dumps' ); ?></strong>
  </p>
  <p>
    <?php $statsLink = "<a href='https://dumps.wikimedia.org/other/pageviews/'>dumps.wikimedia.org</a>"; ?>
    <?php echo $I18N->msg( 'faq-data-dumps-body', [ 'variables' => [ $statsLink ] ] ); ?>
  </p>
</li>

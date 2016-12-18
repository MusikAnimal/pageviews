<li class="list-group-item" id="location">
  <p>
    <strong><?php echo $I18N->msg( 'faq-location-title' ); ?></strong>
  </p>
  <p>
    <?php $statsLink = "<a href='https://stats.wikimedia.org/wikimedia/squids/SquidReportPageViewsPerCountryBreakdown.htm'>stats.wikimedia.org</a>"; ?>
    <?php echo $I18N->msg( 'faq-location-body', [ 'variables' => [ $statsLink ] ] ); ?>
  </p>
</li>

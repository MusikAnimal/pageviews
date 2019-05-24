<li class="list-group-item" id="anomaly">
  <p>
    <strong><?php echo $I18N->msg( 'faq-anomaly-title' ); ?></strong>
  </p>
  <p>
    <?php echo $I18N->msg( 'faq-anomaly-body1' ); ?>
  </p>
  <p>
    <?php $anomalyLink = "<a target='_blank' href='https://phabricator.wikimedia.org/maniphest/task/edit/form/1/?projects=Pageviews-Anomaly'>Phabricator</a>"; ?>
    <?php echo $I18N->msg( 'faq-anomaly-body2', [ 'variables' => [ $anomalyLink ] ] ); ?>
  </p>
</li>

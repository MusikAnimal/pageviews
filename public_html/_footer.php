<footer class="col-lg-10">
  <span>
    <?php $MusikAnimal = "<a href='https://en.wikipedia.org/wiki/User:MusikAnimal'>MusikAnimal</a>"; ?>
    <?php $Kaldari = "<a href='https://en.wikipedia.org/wiki/User:Kaldari'>Kaldari</a>"; ?>
    <?php $MarcelRuizForns = "<a href='https://en.wikipedia.org/wiki/User:Mforns_(WMF)'>Marcel Ruiz Forns</a>"; ?>
    <?php echo $I18N->msg( 'credits', array( 'variables' => array( $MusikAnimal, $Kaldari, $MarcelRuizForns ) ) );; ?>
  </span>
  <span class="nowrap">
    <?php $heart = "<span class='heart'>&hearts;</span>"; ?>
    <?php $host = "<a href='https://wikitech.wikimedia.org/wiki/Portal:Tool_Labs'>" . $I18N->msg( 'tool-labs' ) . "</a>"; ?>
    <?php echo $I18N->msg( 'hosted', array( 'variables' => array( $heart, $host ) ) );; ?>
  </span>
  <div>
    <a href="/{$app}/faq">
      <?php echo $I18N->msg( 'faq' ); ?>
    </a>
    &middot;
    <a href="#" data-toggle="modal" data-target="#disclaimer-modal">
      <?php echo $I18N->msg( 'disclaimer' ); ?>
    </a>
    &middot;
    <a href="/{$app}/url_structure">
      <?php echo $I18N->msg( 'url-structure' ); ?>
    </a>
    &middot;
    <a href="https://github.com/MusikAnimal/pageviews">
      <?php echo $I18N->msg( 'view-source' ); ?>
    </a>
    &middot;
    <a href="https://github.com/MusikAnimal/pageviews/issues">
      <?php echo $I18N->msg( 'report-issue' ); ?>
    </a>
  </div>
</footer>
<div id="disclaimer-modal" class="modal fade" role="dialog" tabindex="-1">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button class="close" arialabel="Close" data-dismiss="modal" type="button">
          <span ariahidden="true">&times;</span>
        </button>
        <h4 class="modal-title">
          <?php echo $I18N->msg( 'disclaimer' ); ?>
        </h4>
      </div>
      <div class="modal-body">
        <?php $api = "<a href='https://wikimedia.org/api/rest_v1/?doc#/'>" . $I18N->msg( 'rest-api' ) . "</a>"; ?>
        <?php $maintainer = "<a href='https://en.wikipedia.org/wiki/User:MusikAnimal'>" . $I18N->msg( 'maintainer' ) . "</a>"; ?>
        <?php echo $I18N->msg( 'disclaimer-text', array( 'variables' => array( $api, $maintainer ) ) );; ?>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" data-dismiss="modal" type="button">
          <?php echo $I18N->msg( 'ok' ); ?>
        </button>
      </div>
    </div>
  </div>
</div>
<footer class="col-lg-10">
  <span>
    Brought to you by
    <a href="https://en.wikipedia.org/wiki/User:MusikAnimal">MusikAnimal</a>,
    <a href="https://en.wikipedia.org/wiki/User:Kaldari">Kaldari</a>
    and
    <a href="https://wikimediafoundation.org/wiki/User:Mforns_(WMF)">Marcel Ruiz Forns</a>.
  </span>
  <span class="nowrap">
    Hosted with
    <span class="heart">&hearts;</span>
    on
    <a href="https://wikitech.wikimedia.org/wiki/Portal:Tool_Labs">Tool Labs</a>.
  </span>
  <div>
    <a href="/<?php echo $app; ?>/faq">FAQ</a>
    &middot;
    <a href="#" data-toggle="modal" data-target="#disclaimer-modal">Disclaimer</a>
    &middot;
    <a href="/<?php echo $app; ?>/url_structure">URL Structure</a>
    &middot;
    <a href="https://github.com/MusikAnimal/pageviews">View source</a>
    &middot;
    <a href="https://github.com/MusikAnimal/pageviews/issues">Report an issue</a>
  </div>
</footer>

<div id="disclaimer-modal" class="modal fade" role="dialog" tabindex="-1">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button class="close" arialabel="Close" data-dismiss="modal" type="button">
          <span ariahidden="true">&times;</span>
        </button>
        <h4 class="modal-title">Disclaimer</h4>
      </div>
      <div class="modal-body">
        Data is fetched from the <a href="https://wikimedia.org/api/rest_v1/?doc#/">Wikimedia REST API</a>.
        This API is still listed to be in an
        <b><a href="https://www.mediawiki.org/wiki/API_versioning#Experimental">experimental phase</a></b>.
        This means functionality <i>could</i> <b>break at any time without warning</b>. The
        maintainers will work to stay up-to-date with API changes, but no promises can be made
        that the tool will indefinitely be stable until the API is released as stable.
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" data-dismiss="modal" type="button">OK</button>
      </div>
    </div>
  </div>
</div>

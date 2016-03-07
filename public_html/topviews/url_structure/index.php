<!DOCTYPE html>
<html>
  <head>
    <?php include "../../_head.php"; ?>
    <title>Topviews Analysis – URL Structure</title>
  </head>
  <body>
    <div class="container">
      <div class="col-lg-offset-2">
        <!-- Header -->
        <header class="row aqs-row">
          <div class="col-lg-10 text-center">
            <h4>
              <strong>Topviews Analysis – URL Structure</strong>
            </h4>
          </div>
        </header>
        <div class="col-lg-10">
          To show the default list of top viewed pages on your wiki, use:
          <pre>//tools.wmflabs.org/topviews#project=en.wikipedia.org</pre>
          replacing <code>en.wikipedia.org</code> with a valid <a href="https://meta.wikimedia.org/w/api.php?action=sitematrix&amp;formatversion=2">project</a>. You can also use <code>excludes</code> to exclude certain pages from view, such as the Main Page.
          <p class="intro">
            Topviews Analysis uses the JavaScript <a href="https://en.wikipedia.org/wiki/Fragment_identifier">fragment identifier</a> to construct the URL parameters. This means instead of <code>?</code> all parameters follow a hashmark <code>#</code>
          </p>
        </div>
        <div class="col-lg-10">
          <h3>
            Parameters
            <small>Can be used in any order</small>
          </h3>
          <hr>
          <dl class="dl-horizontal">
            <dt>project</dt>
            <dd>
              <code>en.wikipedia.org</code>
              (default) or other valid <a href="https://meta.wikimedia.org/w/api.php?action=sitematrix&formatversion=2">project</a>
            </dd>
            <dt>excludes</dt>
            <dd>
              Any pages to exclude from the view, such as false-positives or irrelevant pages like the Main Page.
            </dd>
            <dt>start</dt>
            <dd>
              Start date in the format <code>YYYY-MM-DD</code>, defaults to 7 days ago
              <br>
              Omit this parameter and the <code>end</code> parameter to show the most recent data
            </dd>
            <dt>end</dt>
            <dd>
              End date in the format <code>YYYY-MM-DD</code>, defaults to previous day
            </dd>
            <dt>platform</dt>
            <dd>
              One of <code>user</code> (human viewer, default), <code>spider</code> (search engine crawlers), <code>bot</code> (WMF bots) or <code>all-agents</code> (user, spider and bot)
            </dd>
          </dl>
        </div>
        <div class="col-lg-10 text-center">
          <hr>
          <a href="/topviews">Return to Topviews Analysis</a>
        </div>
        <?php $app = "topviews"; ?>
        <?php include "../../_footer.php"; ?>
      </div>
    </div>
  </body>
</html>
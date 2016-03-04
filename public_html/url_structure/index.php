<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title>Pageviews Analysis – URL Structure</title>
  </head>
  <body>
    <div class="container">
      <div class="col-lg-offset-2">
        <!-- Header -->
        <header class="row aqs-row">
          <div class="col-lg-10 text-center">
            <h4>
              <strong>Pageviews Analysis – URL Structure</strong>
            </h4>
          </div>
        </header>
        <div class="col-lg-10">
          To get the latest data on a given article on your wiki, with default options, use:
          <pre>//tools.wmflabs.org/pageviews#project=en.wikipedia.org&amp;pages={{FULLPAGENAMEE}}</pre>
          replacing <code>en.wikipedia.org</code> with a valid <a href="https://meta.wikimedia.org/w/api.php?action=sitematrix&amp;formatversion=2">project</a>. <code>{{FULLPAGENAMEE}}</code> will resolve to the page the link is placed on
          <p class="intro">
            Pageviews Analysis uses the JavaScript <a href="https://en.wikipedia.org/wiki/Fragment_identifier">fragment identifier</a> to construct the URL parameters. This means instead of <code>?</code> all parameters follow a hashmark <code>#</code>
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
              (default) or other valid <a href="https://meta.wikimedia.org/w/api.php?action=sitematrix&amp;formatversion=2">project</a>
            </dd>
            <dt>pages</dt>
            <dd>
              Escaped page names separated by a pipe <code>|</code> such as <code>Cat|Dog</code> (default)
              <br>
              For linking to the current page on wiki, use <code>{{FULLPAGENAMEE}}</code>
            </dd>
            <dt>start</dt>
            <dd>
              Start date in the format <code>YYYY-MM-DD</code>, defaults to 20 days ago
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
          <a href="/pageviews">Return to Pageviews Analysis</a>
        </div>
        <?php $app = "pageviews"; ?>
        <?php include "../_footer.php"; ?>
      </div>
    </div>
  </body>
</html>
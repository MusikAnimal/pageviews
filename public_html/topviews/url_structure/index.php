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
              Escaped page names to exclude from the view separated by a pipe <code>|</code>, such as false-positives or irrelevant pages. For example <code>Main_page|Special:Search</code>
            </dd>
            <dt>range</dt>
            <dd>
              A special range to use instead of exact <code>start</code> and <code>end</code> dates. May be one of the following:
              <ul class="special-ranges">
                <li>
                  <code>last-week</code>
                  (default)
                </li>
                <li>
                  <code>this-month</code>
                </li>
                <li>
                  <code>last-month</code>
                </li>
                <li>
                  <code>latest</code>
                  The last 20 days of data
                </li>
                <li>
                  <code>latest-<i>N</i></code>
                  where <i>N</i> is a number. For example <code>latest-30</code> will show the last 30 days of data
                </li>
              </ul>
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
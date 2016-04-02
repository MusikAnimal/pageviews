<!DOCTYPE html>
<html>
  <head>
    <?php include '../../_head.php'; ?>
    <title>Langviews Analysis – URL Structure</title>
  </head>
  <body>
    <div class="container">
      <div class="col-lg-offset-2">
        <!-- Header -->
        <header class="row aqs-row">
          <div class="col-lg-10 text-center">
            <h4>
              <strong>Langviews Analysis – URL Structure</strong>
            </h4>
          </div>
        </header>
        <div class="col-lg-10">
          To get the latest cross-language pageviews data on a given article on your wiki, with default options, use:
          <pre>//tools.wmflabs.org/langviews?project=en.wikipedia.org&amp;pages={{FULLPAGENAMEE}}</pre>
          replacing <code>en.wikipedia.org</code> with a valid multilingual <a href="https://meta.wikimedia.org/w/api.php?action=sitematrix&amp;formatversion=2">project</a>. <code>{{FULLPAGENAMEE}}</code> will resolve to the page the link is placed on
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
              (default) or other valid multilingual <a href="https://meta.wikimedia.org/w/api.php?action=sitematrix&amp;formatversion=2">project</a>
            </dd>
            <dt>page</dt>
            <dd>
              Escaped page name. For linking to the current page on wiki, use <code>{{FULLPAGENAMEE}}</code>
            </dd>
            <dt>range</dt>
            <dd>
              A special range to use instead of exact <code>start</code> and <code>end</code> dates. May be one of the following:
              <ul class="special-ranges">
                <li>
                  <code>latest-<i>N</i></code>
                  where <i>N</i> is a number. For example <code>latest-30</code> will show the last 30 days of data
                </li>
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
              </ul>
            </dd>
            <dt>start</dt>
            <dd>
              Start date in the format <code>YYYY-MM-DD</code>
            </dd>
            <dt>end</dt>
            <dd>
              End date in the format <code>YYYY-MM-DD</code>, defaults to previous day
            </dd>
            <dt>platform</dt>
            <dd>
              One of <code>all-access</code> (default), <code>desktop</code>, <code>mobile-app</code> or <code>mobile-web</code>
            </dd>
            <dt>agent</dt>
            <dd>
              One of <code>user</code> (human viewer, default), <code>spider</code> (search engine crawlers), <code>bot</code> (WMF bots) or <code>all-agents</code> (user, spider and bot)
            </dd>
            <dt>sort</dt>
            <dd>
              Which column to sort. One of <code>lang</code>, <code>title</code>, <code>badges</code> or <code>views</code>
            </dd>
            <dt>direction</dt>
            <dd>
              The sort direction. <code>1</code> for descending, <code>-1</code> for ascending
            </dd>
          </dl>
        </div>
        <div class="col-lg-10 text-center">
          <hr>
          <a href="/langviews">Return to Langviews Analysis</a>
        </div>
        <?php $app = "langviews"; ?>
        <?php include "../../_footer.php"; ?>
      </div>
    </div>
  </body>
</html>
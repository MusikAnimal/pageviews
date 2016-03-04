<!DOCTYPE html>
<html>
  <head>
    <?php include '../_head.php'; ?>
    <title>Pageviews Analysis – FAQ</title>
  </head>
  <body>
    <div class="container">
      <div class="col-lg-offset-2">
        <!-- Header -->
        <header class="row aqs-row">
          <div class="col-lg-10 text-center">
            <h4>
              <strong>
                Pageviews Analysis – FAQ
              </strong>
            </h4>
          </div>
        </header>
        <div class="col-lg-10">
          <ul class="list-group">
            <li class="list-group-item">
              <p>
                <strong>Why can't I view data older than October 2015?</strong>
              </p>
              <p>
                The Wikimedia pageviews API was introduced in August 2015, but data really only became reliable until October of that year. You will have to rely on other tools such as <a href="http://stats.grok.se">stats.grok.se</a> to view data older than this. Whether or not they work is unfortunately outside the scope of the Pageviews Anaylsis tool, and beyond the control of the maintainers. There is talk that the Wikimedia Foundation will backfill historical data, but it's unclear when this will happen.
              </p>
            </li>
            <li class="list-group-item">
              <p>
                <strong>Why do I need to disable my ad blocker?</strong>
              </p>
              <p>
                There are no ads being served. It's actually the <a href="https://wikimedia.org/api/rest_v1/?doc#/">Wikimedia REST API</a> that the ad blockers are complaining about, not the tool itself. It is unclear why this happens. Investigation pending.
              </p>
            </li>
            <li class="list-group-item">
              <p>
                <strong>What are the "Agents"?</strong>
              </p>
              <ul class="agents-ul">
                <li>
                  <i>Users</i>
                  includes all people who view a page. Editors, anonymous editors, and our readers.
                </li>
                <li>
                  <i>
                    <a href="https://en.wikipedia.org/wiki/Web_crawler">Spiders</a>
                  </i>
                  or "crawlers" are search engines like Google that read pages for the purposes of improving search results. Pages can receive significant views from web crawlers, which is why by default the tool shows data only from users.
                </li>
                <li>
                  <i>Bots</i>
                  are any other automated programs that may scrape pages for other purposes.
                </li>
              </ul>
            </li>
            <li class="list-group-item">
              <p>
                <strong>I don't like this kind of chart</strong>
              </p>
              <p>
                Select "Change chart type" at the bottom-left to choose amongst 6 different types. The app will remember your preference. By default, the application will show a bar chart when viewing data for a single page, and a line chart for multiple pages.
              </p>
              <p>
                Note that the pie, doughnut and polar area charts can only show data for total number of views within the daterange.
              </p>
            </li>
            <li class="list-group-item">
              <p>
                <strong>It's hard to hover my mouse over the points of the line chart</strong>
              </p>
              <p>
                You can also hover over the date labels at the bottom to see data for each individual day. This is especially helpful on mobile. Simply tap and hold on a date label, and move your finger left and right to view data for each individual day.
              </p>
            </li>
            <li class="list-group-item">
              <p>
                <strong>I want to see the top viewed pages within a date range</strong>
              </p>
              <p>
                Currently, the <a href="https://wikimedia.org/api/rest_v1/?doc#/">Wikimedia REST API</a> offers data for the top viewed pages, but it does not function properly. Until the API is in a more stable state, this information cannot reliably be shown to you. Sorry.
              </p>
            </li>
            <li class="list-group-item">
              <p>
                <strong>I have a feature request or bug to report</strong>
              </p>
              <p>
                Please review the requests listed on <a href="https://github.com/MusikAnimal/pageviews/issues">GitHub</a>. If you have a new request, creating a new issue there is preferred, but you may also contact the developer directly on <a href="https://en.wikipedia.org/wiki/User_talk:MusikAnimal">Wikipedia</a>.
              </p>
            </li>
          </ul>
        </div>
        <div class="col-lg-10 text-center">
          <a href="/pageviews">Return to Pageviews Analysis</a>
        </div>
        <?php $app = "pageviews"; ?>
        <?php include "../_footer.php"; ?>
      </div>
    </div>
  </body>
</html>
<!DOCTYPE html>
<html>
  <head>
    <?php include "../../_head.php"; ?>
    <title>Topviews Analysis - FAQ</title>
  </head>
  <body>
    <div class="container">
      <div class="col-lg-offset-2">
        <!-- Header -->
        <header class="row aqs-row">
          <div class="col-lg-10 text-center">
            <h4>
              <strong>Topviews Analysis – FAQ</strong>
            </h4>
          </div>
        </header>
        <div class="col-lg-10">
          <ul class="list-group">
            <li class="list-group-item">
              <p>
                <strong>Why can't I view data older than August 2015?</strong>
              </p>
              <p>
                The Wikimedia pageviews API was introduced in August 2015 and does not include data from before that time. You will have to rely on other tools such as <a href="http://stats.grok.se">stats.grok.se</a> to view data older than this. Whether or not they work is unfortunately outside the scope of the Topviews Anaylsis tool, and beyond the control of the maintainers.
              </p>
            </li>
            <li class="list-group-item">
              <p>
                <strong>Why can't I view data for today's date?</strong>
              </p>
              <p>
                The Wikimedia pageviews API generally takes a full 24 hours to populate, sometimes longer. In some situations you may see data missing for yesterday's date as well, which will be left blank rather than showing a count of zero views.
              </p>
            </li>
            <li class="list-group-item">
              <p>
                <strong>Why do I need to disable my ad blocker?</strong>
              </p>
              <p>
                There are no ads being served. It's actually the <a href="https://wikimedia.org/api/rest_v1/?doc#/">Wikimedia REST API</a> that the ad blockers are complaining about. This is due to the fact that the URL for the API request includes the string "/pageviews/", which is blacklisted by the <a href="https://easylist-downloads.adblockplus.org/easyprivacy.txt">EasyPrivacy list</a>. If your ad blocker allows you to control which lists you are subscribed to, removing the subscription to EasyPrivacy should also solve the issue.
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
          <a href="/topviews">Return to Topviews Analysis</a>
        </div>
        <?php $app = "topviews"; ?>
        <?php include "../../_footer.php"; ?>
      </div>
    </div>
  </body>
</html>
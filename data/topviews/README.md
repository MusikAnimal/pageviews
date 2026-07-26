# Topviews yearly datasets

AQS has no yearly "top pageviews" endpoint, so the yearly mode serves
the pre-generated static datasets from the legacy tool. Drop them here
as `<project>/<year>.json` (project without `.org`), e.g.:

    data/topviews/en.wikipedia/2016.json

Each file is a JSON array of entries shaped like:

    { "article": "Underscored_title", "views": 123456, "mobile_percentage": 61.4 }

They are served through `/api/metrics/top/{project}?date=YYYY`, with
the curated excludes (config/topviews_excludes.yaml) applied and ranks
recomputed, like the daily/monthly lists.

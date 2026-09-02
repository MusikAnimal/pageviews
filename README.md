# Pageviews Analysis

A suite of tools to visualize pageviews and related data of Wikimedia
Foundation wikis.

Live tool: <https://pageviews.toolforge.org> — and its sister apps
[Topviews](https://pageviews.toolforge.org/topviews),
[Langviews](https://pageviews.toolforge.org/langviews),
[Siteviews](https://pageviews.toolforge.org/siteviews),
[Massviews](https://pageviews.toolforge.org/massviews),
[Redirect Views](https://pageviews.toolforge.org/redirectviews),
[Userviews](https://pageviews.toolforge.org/userviews) and
[Mediaviews](https://pageviews.toolforge.org/mediaviews).

- User documentation: <https://meta.wikimedia.org/wiki/Pageviews_Analysis>
- Feedback forum: <https://meta.wikimedia.org/wiki/Talk:Pageviews_Analysis>
- Bug tracker: <https://phabricator.wikimedia.org/project/board/2045/>
- Toolforge maintainer documentation: <https://wikitech.wikimedia.org/wiki/Tool:Pageviews>

## About this codebase

This is a rewrite of the [original Pageviews Analysis](https://github.com/MusikAnimal/pageviews)
(jQuery, Chart.js, gulp, HAML) into a maintainable modern stack, at
feature parity with the legacy tool:

- **Backend** — [Symfony](https://symfony.com) (PHP), proxying only the
  Toolforge database replicas and the Wikimedia AQS/Pageviews metrics
  REST API.
- **Frontend** — [Vue 3](https://vuejs.org) with [Pinia](https://pinia.vuejs.org)
  and vue-router, mounted through [Symfony UX Vue](https://ux.symfony.com/vue)
  and [Vite](https://vite.dev), styled with the
  [Wikimedia Codex](https://doc.wikimedia.org/codex/) design system.
- **Charts** — [Apache ECharts](https://echarts.apache.org).
- **i18n** — [banana-i18n](https://github.com/wikimedia/banana-i18n),
  translated at [translatewiki.net](https://translatewiki.net).

The eight apps share a small set of Vue components, Pinia stores and
Symfony controller/repository pairs; each app owns only its settings,
results view and store. Reports are fully described by the URL query
string (legacy-compatible), so permalinks from the original tool
continue to resolve.

## Development

See **[DEVELOPERS.md](DEVELOPERS.md)** for the Docker setup, the
Toolforge replica tunnels, and how to run the tests and linters.
Architecture decisions and coding conventions live in
**[CLAUDE.md](CLAUDE.md)**.

## Contributing

Bug reports and patches are welcome via the
[bug tracker](https://phabricator.wikimedia.org/project/board/2045/).
Translations are handled through
[translatewiki.net](https://translatewiki.net) — please do not submit
translations directly.

## License

The source code is released under the
[MIT license](https://opensource.org/licenses/MIT).

The underlying data shown in these applications is provided by the
[Wikimedia REST API](https://wikimedia.org/api/rest_v1/), released under
the [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
dedication.

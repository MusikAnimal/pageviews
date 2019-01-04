# Pageviews Analysis
A suite of tools to visualize pageviews data of Wikimedia Foundation wikis

Live tool: https://tools.wmflabs.org/pageviews (and [Langviews](https://tools.wmflabs.org/langviews), [Topviews](https://tools.wmflabs.org/topviews), [Siteviews](https://tools.wmflabs.org/siteviews), [Massviews](https://tools.wmflabs.org/massviews), [Redirect Views](https://tools.wmflabs.org/redirectviews), [Userviews](https://tools.wmflabs.org/userviews), [Mediaviews](https://tools.wmflabs.org/mediaviews))

* User documentation: https://meta.wikimedia.org/wiki/Pageviews_Analysis
* JavaScript documentation: https://tools.wmflabs.org/pageviews/jsdocs
* Metaviews (pageviews of the Pageviews apps): https://tools.wmflabs.org/metaviews
* Toolforge maintainer documentation: https://wikitech.wikimedia.org/wiki/Tool:Pageviews

IE10 and Safari 8 and below are not supported.

[![Build Status](https://travis-ci.org/MusikAnimal/pageviews.svg?branch=master)](https://travis-ci.org/MusikAnimal/pageviews)

## License
The source code for Pageviews Analysis and it's sister applications is released under the [MIT license](https://github.com/MusikAnimal/pageviews/blob/master/LICENSE).

The underlying data shown in these applications was provided by the [Wikimedia RESTBase API](https://wikimedia.org/api/rest_v1/), released under the [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/) dedication.

Screenshots of the charts in Pageviews Analysis may be used without attribution, but a link back to the application would be appreciated.

## Dependencies
This guide mostly assumes you're using MacOS or Linux. The setup process may differ on Windows machines.

1. [Node](https://nodejs.org/en/)

1. [PHP](http://php.net/) 5.6+ – PHP is for rendering partials in the views and for the [Intuition](https://github.com/Krinkle/intuition) i18n framework, and for some internal APIs that query the replicas.

1. [Composer](https://getcomposer.org/)

1. [ESLint](http://eslint.org/) and [SCSS-lint](https://github.com/brigade/scss-lint) – The linters are not necessary, but preferred so your code maintains a consistent style.

## Setup
1. Install all node packages and dependencies with `npm install`.

1. Run `composer install` to install all PHP dependencies.

1. Run `npm install` to install all Node dependencies.

1. Create a copy of `config.sample.php` named `config.php`. See the comments within that file on what you need to configure.

1. Optionally [create the "meta" database](https://wikitech.wikimedia.org/wiki/Tool:Pageviews#Meta_database) on your local machine. This database is used for usage tracking, and also to store known [false positives](https://tools.wmflabs.org/topviews/faq/#false_positive) for Topviews. Unless you're working on Topviews, you can skip this step.

1. Run `./node_modules/.bin/gulp` to watch the javascripts, stylesheets and views and automatically recompile when new changes are saved.

1. Go to the public directory (`cd public_html`) and start the server with `php -S localhost:8000`.

You should be able to access each application as a subpath of localhost:8000, e.g. http://localhost:8000/pageviews.

## Code walkthrough
This app aims to be a part of the future and not linger in the past. JavaScript is written in [ES6](http://es6-features.org/) where possible, and transpiled to ES5 with [Babel](https://babeljs.io/). If you need to add a polyfill for something, add it to `/javascript/shared/polyfills.js`.

All assets and views are ultimately placed in `public_html`. With the exception of images, you won't need to make any manual modifications to this directory.

### Structure
The repo contains eight separate applications that share code with each other (Pageviews, Langviews, Topviews, Siteviews, Massviews, Redirect Views, Userviews, and Mediaviews). Each app has a dedicated subdirectory within `javascripts`, `stylesheets` and `views`. The main development asset files share the same name as the app (e.g. `pageviews.js` for the main JavaScript file for Pageviews). After compilation each app has it's own `application.js` and `application.css` in the public_html directory. PHP partials and Sass imports are prepended with underscores (e.g. `_footer.php`, `_mixins.scss`).

There are symlinks all throughout the public_html directory. These are to ensure you can use the native PHP server on your local machine and also deploy to Toolforge with the same code. The symlinks effectively change the document root of Toolforge's lighttpd server.

#### JavaScripts
[Browserify](http://browserify.org/) is used to help follow a module pattern. You'll need to `require('./file_name')` any file that is a dependency. All JavaScript is written in ES6 (and possibly ES7).

Each app has it's own `config.js`, which are constants for application-wide use. Pageviews, Siteviews and Mediaviews also have a `templates.js` file that defines how data is shown in the right column on the interface.

Shared JavaScript goes in the `/shared` directory and must be required as needed. `list_helpers.js` is used on apps that have a list view, which are Massviews, Langviews, Redirect Views and Userviews. All apps but Topviews show a chart of some sort, and require `chart_helpers.js`.

When the JS files are compiled, they are concatenated into a single `application.js` that lives within the directory for that app inside `public_html`.

All JavaScript is documented using [JSDoc](http://usejsdoc.org/). The documentation is hosted at https://tools.wmflabs.org/pageviews/jsdocs. You can generate the docs locally by running:
```
./node_modules/.bin/gulp jsdoc && open jsdocs/gen/index.html
```

#### Styles
Styles are written in [http://sass-lang.com/](Sass) and [compiled to CSS](https://github.com/dlmanning/gulp-sass). The CSS is then [automatically vendor-prefixed](https://github.com/sindresorhus/gulp-autoprefixer) to support modern browsers. [Bootstrap](http://getbootstrap.com/) is used as the CSS framework.

Each page has it's own `.scss` file that imports dependencies. Shared files are simply prefixed with an underscore. `_mixins.scss` is for the mixins, placeholders, keyframes and colour variables. Similar to the JavaScripts, `_list_view.scss` is imported by apps that have a list view (Massviews, Langviews, Redirect Views and Mediaviews), and `_chart_view.scss` by apps that show charts.

#### Haml
The views within `/views` are written in [MtHaml](https://github.com/arnaud-lb/MtHaml) and compiled to PHP files in `/public_html`.

### Local
Run `./node_modules/.bin/gulp` to watch for changes and automatically compile as needed. You can also run tasks by app and function, such as `gulp massviews` for all Massviews-related files, or `gulp scripts` to compile only the JavaScripts, but `gulp` by itself should be all you need.

### Production
Before making a pull request or pushing to master, remember to run `./node_modules/.bin/gulp production` so the assets are minified and concatenated. JSDocs are also generated, and placed in a dedicated sub-repo (not submodule) in `jsdocs/gen`. These can optionally be pull requested to the [JSDocs repo](https://github.com/MusikAnimal/pageviews-jsdocs).

For deployment instructions, see [Tool:Pageviews](https://wikitech.wikimedia.org/wiki/Tool:Pageviews) on Wikitech.org.

## Tests
Tests will be ran automatically when you push or create a pull request.

### Acceptance
Pageviews Analysis was once tested with acceptance tests, but after significant maintenance burden and general flakiness of the tests, they have been retired :(

### Linters
The styling of all ES6 and SCSS is enforced with linters. You can run these locally with `./node_modules/.bin/gulp lint`, and will also be ran when you run `gulp production`. If you need a particular rule to be ignored, you can add exceptions (see [Scss-lint](https://github.com/brigade/scss-lint/blob/master/lib/scss_lint/linter/README.md#disablelinterreason), [Eslint](http://eslint.org/docs/user-guide/configuring)).
